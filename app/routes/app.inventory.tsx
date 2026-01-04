import prisma from "app/db.server"
import { authenticate } from "app/shopify.server"
import { LoaderFunctionArgs, useLoaderData } from "react-router"
import {Layout, Page, Card, IndexTable, Text, useIndexResourceState} from "@shopify/polaris"
import { AppProvider } from "@shopify/shopify-app-react-router/react"


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

export default function InventoryManager() {
    const {products, settings} = useLoaderData()


    const variants = products.flatMap((productEdge: any) => {
        const product = productEdge.node;
        return product.variants.edges.map((variantEdge: any) => ({...variantEdge.node, productTitle: product.title, productStatus: product.status}));
    });

    variants.sort((x, y) => {
        return x.productStatus !== y.productStatus ? x.productStatus.localeCompare(y.productStatus) : x.productTitle.localeCompare(y.productTitle);
    });

    const {selectedResources, allResourcesSelected, handleSelectionChange} = useIndexResourceState(variants);


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
                <IndexTable.Cell>{variant.inventoryQuantity}</IndexTable.Cell>
                <IndexTable.Cell> {variant.productStatus} </IndexTable.Cell>
                </IndexTable.Row>
            );
        });
    

    return (
        <Page>
            <Layout>
                <Layout.Section>
                     <Card>
                        <IndexTable 
                            itemCount={rows.length} 
                            headings={[{title: 'Product'}, {title: 'Variant'}, {title: 'Inventory Quantity'}, {title: 'Status'}]}
                            onSelectionChange={handleSelectionChange}
                            selectedItemsCount={
                                allResourcesSelected ? 'All' : selectedResources.length
                            }
                        >
                            {rows}
                        </IndexTable>
                     </Card>
                </Layout.Section>
            </Layout>
        </Page>       
    )

}