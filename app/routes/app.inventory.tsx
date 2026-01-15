import prisma from "app/db.server"
import { authenticate } from "app/shopify.server"
import { LoaderFunctionArgs, useLoaderData, ActionFunctionArgs } from "react-router"
import {Layout, Page, Card, IndexTable, Text, useIndexResourceState, Badge, BlockStack, InlineGrid, Icon, Frame, Modal} from "@shopify/polaris"
import { AppProvider } from "@shopify/shopify-app-react-router/react"
import { Product } from "@shopify/app-bridge-react"
import { useEffect, useState } from "react"
import {SettingsIcon} from '@shopify/polaris-icons';
import VariantSettingModal from "app/components/VariantSettingModal"
import { IndexTableSortDirection } from "@shopify/polaris/build/ts/src/components/IndexTable"


export const loader = async ({request} : LoaderFunctionArgs) => {
    const {admin, session} = await authenticate.admin(request)

    const response = await admin.graphql(
        `query {
            products(first: 10) {
                edges {
                    node {
                        id
                        title
                        status
                        variants(first: 5) {
                            edges {
                                node {
                                    id
                                    title
                                    inventoryQuantity
                                }
                            }
                        }
                    }
                }
            }
        }`
    )

    const responseJson = await response.json()

    await ensureInventorySettings(session.shop, responseJson.data.products.edges)

    const settings = await prisma.inventorySetting.findMany({
        where: {shop: session.shop },
    })

    return {
        products: responseJson.data.products.edges,
        settings
    }

}

async function ensureInventorySettings(shop: string, products: any[]) {
    const allVariants = products.flatMap((productEdge: any) => {
        const product = productEdge.node;
        return product.variants.edges.map((variantEdge: any) => ({
            productId: product.id,
            variantId: variantEdge.node.id
        }));
    });

    for (const variant of allVariants) {
        await prisma.inventorySetting.upsert({
            where: {
                shop_variantId: {
                    shop: shop,
                    variantId: variant.variantId
                }
            },
            update: {}, 
            create: {
                shop: shop,
                productId: variant.productId,
                variantId: variant.variantId,
                minStock: 5
            }
        })
    }
}

export const action = async ({request}: ActionFunctionArgs) => {
    const {session} = await authenticate.admin(request);
    const formData = await request.formData();
    
    const variantId = formData.get("variantId") as string;
    const minStock = parseInt(formData.get("minStock") as string);
    
    await prisma.inventorySetting.update({
        where: {
            shop_variantId: {
                shop: session.shop,
                variantId: variantId
            }
        },
        data: {
            minStock: minStock
        }
    });
    
    return JSON.stringify({ success: true });
};

export interface ProductVariant {
    id: string;
    title: string;
    inventoryQuantity: number;
    productTitle: string;
    productStatus: string;
    minStockThreshold: number | null;
}

export default function InventoryManager() {
    const {products, settings} = useLoaderData()

    const [settingsModalActive, setSettingsModalActive] = useState(false);
    const [variantSelected, setVariantSelected] = useState(null as ProductVariant | null);

    const [sortedColumn, setSortedColumn] = useState("Status");
    const [sortDirection, setSortDirection] = useState<IndexTableSortDirection>("descending");

    function settingsClickHandler(e: React.MouseEvent, variant: ProductVariant) {
        e.stopPropagation(); 
        setSettingsModalActive(true);
        setVariantSelected(variant);
    }

    const variants = products.flatMap((productEdge: any) => {
        const product = productEdge.node;
        return product.variants.edges.map((variantEdge: any) => {

            const variant = variantEdge.node;

            const variantSetting = settings.find((s: any) => s.variantId === variant.id);

            return {...variantEdge.node, productTitle: product.title, productStatus: product.status, minStockThreshold: variantSetting ? variantSetting.minStock : null  };
        });
    });

    const sortedVariants = variants.sort((x : ProductVariant, y: ProductVariant) => {
        switch (sortedColumn) {
            case "Product":
                return sortDirection === "ascending"
                    ? x.productTitle.localeCompare(y.productTitle)
                    : y.productTitle.localeCompare(x.productTitle);
            case "Variant":
                return sortDirection === "ascending"
                    ? x.title.localeCompare(y.title)
                    : y.title.localeCompare(x.title);
            case "Inventory Quantity":
                return sortDirection === "ascending"
                    ? x.inventoryQuantity - y.inventoryQuantity
                    : y.inventoryQuantity - x.inventoryQuantity;
            case "Status":
                return sortDirection === "ascending"
                    ? x.productStatus.localeCompare(y.productStatus)
                    : y.productStatus.localeCompare(x.productStatus);
        }
    });

    const handleSort = (columnIdx: number, direction: IndexTableSortDirection) => {
        const columnMap = ['Product', 'Variant', 'Inventory Quantity', 'Status'];
        setSortDirection(direction);
        setSortedColumn(columnMap[columnIdx]);
    }
    

    const lowStock = variants.filter((variant: ProductVariant) => variant.inventoryQuantity < (variant.minStockThreshold? variant.minStockThreshold : 5));
    const outOfStock = variants.filter((v: ProductVariant) => v.inventoryQuantity === 0).length;


    const {selectedResources, allResourcesSelected, handleSelectionChange} = useIndexResourceState(variants);

    const rows =  sortedVariants.map((variantNode: any, vIndex: number) => {
        const variant = variantNode;
        const rowId = variant.id; 

            return (
                <IndexTable.Row 
                    id={rowId} 
                    key={rowId} 
                    position={vIndex}
                    selected={selectedResources.includes(rowId)}
                >
                <IndexTable.Cell>
                    <Text fontWeight="bold" as="span">{variant.productTitle}</Text>
                </IndexTable.Cell>
                <IndexTable.Cell>{variant.title}</IndexTable.Cell>
                <IndexTable.Cell>
                    <Text 
                        as="span"
                        tone={variant.inventoryQuantity === 0 ? 'critical' : variant.inventoryQuantity < (variant.minStockThreshold? variant.minStockThreshold : 5) ? 'caution' : 'success'}
                        fontWeight={variant.inventoryQuantity === 0 ? 'bold' : variant.inventoryQuantity < (variant.minStockThreshold? variant.minStockThreshold : 5) ? 'semibold' : 'regular'}
                    >
                        {variant.inventoryQuantity}
                    </Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                    <Badge
                        tone={variant.productStatus === 'ACTIVE' ? 'success' : variant.productStatus === 'DRAFT' ? 'attention' : 'warning'}
                    >        
                        {variant.productStatus}
                    </Badge>
                </IndexTable.Cell>
                
                <IndexTable.Cell>
                    <span 
                        onMouseEnter={(e) => e.currentTarget.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'}
                        onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
                        onClick={(e) => {settingsClickHandler(e, variant)}}
                        style={{display: 'flex', transform: 'scale(1.5)', justifyContent: 'center', alignItems: 'center', transition: 'filter 0.2s ease'}}>
                        <Icon source={SettingsIcon}/>
                    </span>
                </IndexTable.Cell>
                
                </IndexTable.Row>
            );
    });

    return (
        <Page title="Inventory Manager">
            <BlockStack gap="500">
                <InlineGrid columns={{xs: 1, md: 3}} gap="400">
                    <Card>
                        <BlockStack gap="200">
                            <Text as="h2" variant="headingSm" tone="subdued">
                                Total Variants
                            </Text>
                            <Text as="p" variant="heading2xl">
                                {variants.length}
                            </Text>
                        </BlockStack>
                    </Card>
                    
                    <Card>
                        <BlockStack gap="200">
                            <Text as="h2" variant="headingSm" tone="subdued">
                                Low Stock
                            </Text>
                            <Text as="p" variant="heading2xl" tone="caution">
                                {lowStock.length}
                            </Text>
                        </BlockStack>
                    </Card>
                    
                    <Card>
                        <BlockStack gap="200">
                            <Text as="h2" variant="headingSm" tone="subdued">
                                Out of Stock
                            </Text>
                            <Text as="p" variant="heading2xl" tone="critical">
                                {outOfStock}
                            </Text>
                        </BlockStack>
                    </Card>
                </InlineGrid>

                <Card padding="0">
                    <IndexTable 
                        sortable={[true,true,true,true,false]}
                        itemCount={rows.length}
                        resourceName={{singular: 'variant', plural: 'variants'}}
                        headings={[
                            {title: 'Product'}, 
                            {title: 'Variant'}, 
                            {title: 'Inventory Quantity'}, 
                            {title: 'Status'},
                            {title: "Settings"}
                        ]}
                        onSort={handleSort}
                        onSelectionChange={handleSelectionChange}
                        sortDirection={sortDirection}
                        sortColumnIndex={['Product', 'Variant', 'Inventory Quantity', 'Status'].indexOf(sortedColumn)}
                        selectedItemsCount={
                            allResourcesSelected ? 'All' : selectedResources.length
                        }
                    >
                        {rows}
                    </IndexTable>
                </Card>
            </BlockStack>

            {settingsModalActive && <VariantSettingModal modalOpen={settingsModalActive} variant={variantSelected} onClose={() => setSettingsModalActive(false)} />} 
        </Page>    
    )

}