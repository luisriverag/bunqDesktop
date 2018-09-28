import React from "react";
import { translate } from "react-i18next";
import { connect } from "react-redux";
import { ipcRenderer } from "electron";
import Helmet from "react-helmet";
import Redirect from "react-router-dom/Redirect";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import Divider from "@material-ui/core/Divider";
import CircularProgress from "@material-ui/core/CircularProgress";
import Typography from "@material-ui/core/Typography";
import Collapse from "@material-ui/core/Collapse";

import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import HelpIcon from "@material-ui/icons/Help";
import SaveIcon from "@material-ui/icons/Save";
import ArrowUpIcon from "@material-ui/icons/ArrowUpward";
import ArrowDownIcon from "@material-ui/icons/ArrowDownward";

import PDFExportHelper from "../../Components/PDFExportHelper";
import ExportDialog from "../../Components/ExportDialog";
import SpeedDial from "../../Components/SpeedDial";
import TranslateButton from "../../Components/TranslationHelpers/Button";
import MoneyAmountLabel from "../../Components/MoneyAmountLabel";
import TransactionHeader from "../../Components/TransactionHeader";
import CategorySelector from "../../Components/Categories/CategorySelector";
import NoteTextForm from "../../Components/NoteTexts/NoteTextForm";

import { formatMoney, humanReadableDate } from "../../Helpers/Utils";
import {
    requestResponseText,
    requestResponseTypeParser
} from "../../Helpers/StatusTexts";
import { requestResponseUpdate } from "../../Actions/request_response_info";
import {
    requestResponseReject,
    requestResponseAccept
} from "../../Actions/request_response";
import { applicationSetPDFMode } from "../../Actions/application";

const styles = {
    btn: {},
    button: {
        width: "100%"
    },
    paper: {
        padding: 24,
        marginBottom: 12
    },
    list: {
        textAlign: "left"
    },
    textCenter: {
        textAlign: "center"
    }
};

class RequestResponseInfo extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.state = {
            accepted: false,
            displayExport: false,

            initialUpdate: false
        };
    }

    componentDidMount() {
        if (this.props.initialBunqConnect) {
            const { requestResponseId, accountId } = this.props.match.params;
            this.props.requestResponseUpdate(
                this.props.user.id,
                accountId === undefined
                    ? this.props.accountsSelectedAccount
                    : accountId,
                requestResponseId
            );
            this.setState({ initialUpdate: true });
        }
    }

    getSnapshotBeforeUpdate(nextProps, nextState) {
        if (
            this.props.user &&
            this.props.user.id &&
            this.props.initialBunqConnect &&
            this.props.match.params.requestResponseId !==
                this.props.match.params.requestResponseId
        ) {
            const { requestResponseId, accountId } = this.props.match.params;
            this.props.requestResponseUpdate(
                this.props.user.id,
                accountId === undefined
                    ? this.props.accountsSelectedAccount
                    : accountId,
                requestResponseId
            );
            this.setState({ initialUpdate: true });
        }
        return null;
    }
    componentDidUpdate() {}

    startPayment = event => {
        const requestResponseInfo = this.props.requestResponseInfo;
        this.props.history.push(
            `/pay?amount=${requestResponseInfo.getAmount()}`
        );
    };
    startRequest = event => {
        const requestResponseInfo = this.props.requestResponseInfo;
        this.props.history.push(
            `/request?amount=${requestResponseInfo.getAmount()}`
        );
    };

    rejectRequest = () => {
        const { requestResponseId, accountId } = this.props.match.params;
        this.props.requestResponseReject(
            this.props.user.id,
            accountId === undefined
                ? this.props.accountsSelectedAccount
                : accountId,
            requestResponseId
        );
    };

    acceptRequest = () => {
        const { requestResponseId } = this.props.match.params;
        const {
            user,
            requestResponseInfo,
            requestResponseAccountId
        } = this.props;

        const requestResponse = requestResponseInfo.RequestResponse;

        const options = {};

        this.props.requestResponseAccept(
            user.id,
            requestResponseAccountId,
            requestResponseId,
            requestResponse.amount_inquired,
            options
        );
    };

    createPdfExport = () => {
        const { requestResponseInfo } = this.props;

        // enable pdf mode
        this.props.applicationSetPDFMode(true);

        // format a file name
        const timeStamp = requestResponseInfo.created.getTime();
        const fileName = `request-${requestResponseInfo.id}-${timeStamp}.pdf`;

        // delay for a short period to let the application update and then create a pdf
        setTimeout(() => {
            ipcRenderer.send("print-to-pdf", fileName);
        }, 250);
    };

    render() {
        const {
            accountsSelectedAccount,
            requestResponseInfo,
            requestResponseInfoLoading,
            requestResponseLoading,
            t
        } = this.props;
        const paramAccountId = this.props.match.params.accountId;

        // we require a selected account before we can display payment information
        if (accountsSelectedAccount === false && paramAccountId !== undefined) {
            // no account_id set
            return <Redirect to={"/"} />;
        }

        let content;
        let noteTextsForm = null;
        if (
            requestResponseInfo === false ||
            requestResponseInfoLoading === true ||
            this.state.initialUpdate === false
        ) {
            content = (
                <Paper style={styles.paper}>
                    <Grid container spacing={24} justify={"center"}>
                        <Grid item xs={12}>
                            <div style={{ textAlign: "center" }}>
                                <CircularProgress />
                            </div>
                        </Grid>
                    </Grid>
                </Paper>
            );
        } else {
            const requestResponse = requestResponseInfo.RequestResponse;
            const createdDate = humanReadableDate(requestResponse.created);
            const timeRespondedDate = requestResponse.time_responded
                ? humanReadableDate(requestResponse.time_responded)
                : false;
            let paymentAmount = requestResponse.amount_inquired.value;
            paymentAmount =
                requestResponse.status === "ACCEPTED"
                    ? paymentAmount * -1
                    : paymentAmount;

            const formattedPaymentAmount = formatMoney(paymentAmount);
            const requestResponseLabel = requestResponseText(
                requestResponse,
                t
            );

            if (this.props.pdfSaveModeEnabled) {
                return (
                    <PDFExportHelper
                        t={t}
                        payment={requestResponse}
                        formattedPaymentAmount={formattedPaymentAmount}
                        paymentDate={createdDate}
                        paymentDateUpdated={timeRespondedDate}
                        personalAlias={requestResponse.alias}
                        counterPartyAlias={requestResponse.counterparty_alias}
                    />
                );
            }

            noteTextsForm = (
                <NoteTextForm
                    BunqJSClient={this.props.BunqJSClient}
                    event={requestResponse}
                />
            );

            content = [
                <Paper style={styles.paper}>
                    <Grid
                        container
                        spacing={24}
                        align={"center"}
                        justify={"center"}
                    >
                        <TransactionHeader
                            BunqJSClient={this.props.BunqJSClient}
                            to={requestResponse.alias}
                            from={requestResponse.counterparty_alias}
                            user={this.props.user}
                            swap={requestResponse.status === "ACCEPTED"}
                            type="requestResponse"
                            event={requestResponse}
                        />

                        <Grid item xs={12}>
                            <MoneyAmountLabel
                                component={"h1"}
                                style={{ textAlign: "center" }}
                                info={requestResponse}
                                type="requestResponse"
                            >
                                {formattedPaymentAmount}
                            </MoneyAmountLabel>

                            <Typography
                                style={{ textAlign: "center" }}
                                type={"body1"}
                            >
                                {requestResponseLabel}
                            </Typography>

                            <List style={styles.list}>
                                {requestResponse.description.length > 0
                                    ? [
                                          <Divider />,
                                          <ListItem>
                                              <ListItemText
                                                  primary={t("Description")}
                                                  secondary={
                                                      requestResponse.description
                                                  }
                                              />
                                          </ListItem>
                                      ]
                                    : null}

                                <Divider />
                                <ListItem>
                                    <ListItemText
                                        primary={t("Received")}
                                        secondary={createdDate}
                                    />
                                </ListItem>

                                {timeRespondedDate ? (
                                    <React.Fragment>
                                        <Divider />
                                        <ListItem>
                                            <ListItemText
                                                primary={t("Paid")}
                                                secondary={timeRespondedDate}
                                            />
                                        </ListItem>
                                    </React.Fragment>
                                ) : null}

                                {requestResponse.counterparty_alias &&
                                requestResponse.counterparty_alias.iban ? (
                                    <React.Fragment>
                                        <Divider />
                                        <ListItem>
                                            <ListItemText
                                                primary={t("IBAN")}
                                                secondary={
                                                    requestResponse
                                                        .counterparty_alias.iban
                                                }
                                            />
                                        </ListItem>
                                    </React.Fragment>
                                ) : null}

                                <Divider />
                                <ListItem>
                                    <ListItemText
                                        primary={t("Type")}
                                        secondary={requestResponseTypeParser(
                                            requestResponse,
                                            t
                                        )}
                                    />
                                </ListItem>

                                <Divider />
                                <ListItem>
                                    <ListItemText
                                        primary={t("Status")}
                                        secondary={requestResponse.status}
                                    />
                                </ListItem>

                                <Divider />
                                <ListItem>
                                    <ListItemText
                                        primary={t("Sub type")}
                                        secondary={requestResponse.sub_type}
                                    />
                                </ListItem>

                                <Divider />
                            </List>

                            {requestResponse.status === "PENDING" ? (
                                <Grid container spacing={16}>
                                    <Grid item xs={12} sm={6}>
                                        <TranslateButton
                                            variant="raised"
                                            color="primary"
                                            style={styles.button}
                                            disabled={this.state.accepted}
                                            onClick={() => {
                                                this.setState({
                                                    accepted: true
                                                });
                                            }}
                                        >
                                            Continue
                                        </TranslateButton>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TranslateButton
                                            variant="raised"
                                            color="secondary"
                                            disabled={
                                                requestResponseInfoLoading ||
                                                requestResponseLoading
                                            }
                                            onClick={this.rejectRequest}
                                            style={styles.button}
                                        >
                                            Decline
                                        </TranslateButton>
                                    </Grid>
                                </Grid>
                            ) : null}

                            <CategorySelector
                                type={"RequestResponse"}
                                item={requestResponseInfo}
                            />
                        </Grid>
                    </Grid>
                </Paper>,
                <Collapse in={this.state.accepted} collapsedHeight="0px">
                    <Paper style={styles.paper}>
                        <Grid
                            container
                            spacing={24}
                            align={"center"}
                            justify={"center"}
                        >
                            <Grid item xs={12}>
                                <TranslateButton
                                    variant="raised"
                                    disabled={false}
                                    color="primary"
                                    style={styles.button}
                                    onClick={this.acceptRequest}
                                >
                                    Accept request
                                </TranslateButton>
                            </Grid>
                        </Grid>
                    </Paper>
                </Collapse>
            ];
        }

        const exportData =
            this.props.requestResponseInfo &&
            this.props.requestResponseInfo._rawData
                ? this.props.requestResponseInfo._rawData.RequestResponse
                : {};

        return (
            <Grid container spacing={24}>
                <Helmet>
                    <title>{`bunqDesktop - ${t("Request Info")}`}</title>
                </Helmet>

                <ExportDialog
                    closeModal={event =>
                        this.setState({ displayExport: false })
                    }
                    title={t("Export info")}
                    open={this.state.displayExport}
                    object={exportData}
                />

                <Grid item xs={12} sm={2} lg={3}>
                    <Button
                        onClick={this.props.history.goBack}
                        style={styles.btn}
                    >
                        <ArrowBackIcon />
                    </Button>
                </Grid>

                <Grid item xs={12} sm={8} lg={6}>
                    {content}

                    {noteTextsForm}
                </Grid>

                <SpeedDial
                    hidden={false}
                    actions={[
                        {
                            name: "Send payment",
                            icon: ArrowUpIcon,
                            color: "action",
                            onClick: this.startPayment
                        },
                        {
                            name: "Send request",
                            icon: ArrowDownIcon,
                            color: "action",
                            onClick: this.startRequest
                        },
                        {
                            name: "Create PDF",
                            icon: SaveIcon,
                            color: "action",
                            onClick: this.createPdfExport
                        },
                        {
                            name: t("View debug information"),
                            icon: HelpIcon,
                            onClick: event =>
                                this.setState({ displayExport: true })
                        }
                    ]}
                />
            </Grid>
        );
    }
}

const mapStateToProps = state => {
    return {
        user: state.user.user,

        pdfSaveModeEnabled: state.application.pdf_save_mode_enabled,

        requestResponseInfo: state.request_response_info.request_response_info,
        requestResponseAccountId: state.request_response_info.account_id,
        requestResponseInfoLoading: state.request_response_info.loading,

        requestResponseLoading: state.request_response.loading,

        accountsSelectedAccount: state.accounts.selected_account
    };
};

const mapDispatchToProps = (dispatch, ownProps) => {
    const { BunqJSClient } = ownProps;
    return {
        applicationSetPDFMode: enabled =>
            dispatch(applicationSetPDFMode(enabled)),

        requestResponseUpdate: (user_id, account_id, request_response_id) =>
            dispatch(
                requestResponseUpdate(
                    BunqJSClient,
                    user_id,
                    account_id,
                    request_response_id
                )
            ),
        requestResponseAccept: (
            user_id,
            account_id,
            request_response_id,
            amount_responded,
            options
        ) =>
            dispatch(
                requestResponseAccept(
                    BunqJSClient,
                    user_id,
                    account_id,
                    request_response_id,
                    amount_responded,
                    options
                )
            ),
        requestResponseReject: (user_id, account_id, request_response_id) =>
            dispatch(
                requestResponseReject(
                    BunqJSClient,
                    user_id,
                    account_id,
                    request_response_id
                )
            )
    };
};

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(translate("translations")(RequestResponseInfo));
