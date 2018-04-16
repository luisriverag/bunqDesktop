import React from "react";
import { translate } from "react-i18next";
import Button from "material-ui/Button";
import Dialog, {
    DialogContent,
    DialogActions,
    DialogTitle
} from "material-ui/Dialog";

import CategorySelector from "./CategorySelector";

class CategorySelectorDialog extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.state = {};
    }

    render() {
        const { t, open, onClose, type, item } = this.props;

        return (
            <Dialog open={open} onClose={onClose}>
                <DialogTitle>{t("Manage categories")}</DialogTitle>
                <DialogContent>
                    <CategorySelector
                        displayToggleButton={false}
                        type={type}
                        item={item}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Ok</Button>
                </DialogActions>
            </Dialog>
        );
    }
}

export default translate("translations")(CategorySelectorDialog);