import { Modal } from "@shopify/polaris";
import { ProductVariant } from "app/routes/app.inventory";

interface VariantSettingModalProps {
    modalOpen: boolean;
    onClose: () => void;
    variant: ProductVariant | null;
}

export default function VariantSettingModal({modalOpen, variant, onClose}: VariantSettingModalProps) {

    return (
        <Modal 
            open={modalOpen} 
            title={"Variant Settings"} 
            onClose={onClose}
            >

            <Modal.Section>
                Variant settings for {variant?.title} content goes here.
            </Modal.Section>
        </Modal>
    )

}