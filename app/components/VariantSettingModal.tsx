import { Modal, Form, FormLayout, TextField, Button } from "@shopify/polaris";
import { ProductVariant } from "app/routes/app.inventory";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";

interface VariantSettingModalProps {
    modalOpen: boolean;
    onClose: () => void;
    variant: ProductVariant | null;
}

export default function VariantSettingModal({modalOpen, variant, onClose}: VariantSettingModalProps) {

    const [threshold, setThreshold] = useState(variant?.minStockThreshold? variant.minStockThreshold : 0);
    const fetcher = useFetcher();

    useEffect(() => {
        if (modalOpen && variant) {
            setThreshold(variant.minStockThreshold ?? 0);
        }
    }, [modalOpen, variant]);


    const handleChange = (value: string) => {
        setThreshold(parseInt(value));
    };

    const handleSubmit = () => {
        fetcher.submit(
            {
                variantId: variant!.id,
                minStock: threshold.toString()
            },
            { method: "post" }
        );
        
        onClose();
    };

    return (
        <Modal 
            open={modalOpen} 
            title={"Variant Settings"} 
            onClose={onClose}
            >

            <Modal.Section>
                <Form onSubmit={handleSubmit}>
                    <FormLayout>
                        <TextField
                            label="Low Inventory Threshold"
                            type="number"
                            value = {threshold.toString()}
                            onChange={handleChange}
                            autoComplete="off"
                        >

                        </TextField>
                        <Button submit={true}>Save</Button>

                    </FormLayout>
                </Form>
            </Modal.Section>
        </Modal>
    )

}