import prisma from "app/db.server"
import { authenticate } from "app/shopify.server"
import { LoaderFunctionArgs, useLoaderData } from "react-router"
import {Layout, Page, Card, IndexTable, Text, useIndexResourceState, Badge, BlockStack, InlineGrid} from "@shopify/polaris"
import { AppProvider } from "@shopify/shopify-app-react-router/react"
import { Product } from "@shopify/app-bridge-react"
import { useEffect } from "react"

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

    const settings = await prisma.inventorySetting.findMany({
        where: {shop: session.shop },
    })

    return {
        products: responseJson.data.products.edges,
        settings
    }

}

interface ProductVariant {
  id: string;
  title: string;
  inventoryQuantity: number;
  productTitle: string;
  productStatus: string;
}

export default function InventoryManager() {
    const {products, settings} = useLoaderData()


    const variants = products.flatMap((productEdge: any) => {
        const product = productEdge.node;
        return product.variants.edges.map((variantEdge: any) => ({...variantEdge.node, productTitle: product.title, productStatus: product.status}));
    });

    variants.sort((x : ProductVariant, y: ProductVariant) => {    
        return x.productStatus !== y.productStatus ? x.productStatus.localeCompare(y.productStatus) : x.productTitle.localeCompare(y.productTitle);
    });

    const lowStock = variants.filter((variant: ProductVariant) => variant.inventoryQuantity < 5);
    const outOfStock = variants.filter((v: ProductVariant) => v.inventoryQuantity === 0).length;


    const {selectedResources, allResourcesSelected, handleSelectionChange} = useIndexResourceState(variants);

    useEffect(() => {
        console.log(settings);
    });

    const lowStockThreshold = 5;

    const rows =  variants.map((variantNode: any, vIndex: number) => {
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
                        tone={variant.inventoryQuantity === 0 ? 'critical' : variant.inventoryQuantity < 5 ? 'caution' : 'success'}
                        fontWeight={variant.inventoryQuantity === 0 ? 'bold' : variant.inventoryQuantity < 5 ? 'semibold' : 'regular'}
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
                            <Text as="p" variant="bodySm" tone="subdued">
                                {lowStockThreshold} or fewer units
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
                            <Text as="p" variant="bodySm" tone="subdued">
                                Requires immediate attention
                            </Text>
                        </BlockStack>
                    </Card>
                </InlineGrid>

                <Card padding="0">
                    <IndexTable 
                        itemCount={rows.length}
                        resourceName={{singular: 'variant', plural: 'variants'}}
                        headings={[
                            {title: 'Product'}, 
                            {title: 'Variant'}, 
                            {title: 'Inventory Quantity'}, 
                            {title: 'Status'}
                        ]}
                        onSelectionChange={handleSelectionChange}
                        selectedItemsCount={
                            allResourcesSelected ? 'All' : selectedResources.length
                        }
                    >
                        {rows}
                    </IndexTable>
                </Card>
            </BlockStack>
        </Page>    
    )

}