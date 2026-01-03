import prisma from "app/db.server"
import { authenticate } from "app/shopify.server"
import { LoaderFunctionArgs, useLoaderData } from "react-router"
import {Layout, Page, Card, IndexTable, Text} from "@shopify/polaris"
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

    const rows = products.flatMap((productEdge: any, index: number) => {
    const product = productEdge.node;
    
    return product.variants.edges.map((variantEdge: any, vIndex: number) => {
      const variant = variantEdge.node;
      // Unique ID for the row key
      const rowId = variant.id; 

      // 2. MUST use Polaris components, not <tr> or <td>
      return (
        <IndexTable.Row 
            id={rowId} 
            key={rowId} 
            position={index}
        >
          <IndexTable.Cell>
            <Text fontWeight="bold" as="span">{product.title}</Text>
          </IndexTable.Cell>
          <IndexTable.Cell>{variant.title}</IndexTable.Cell>
          <IndexTable.Cell>{variant.inventoryQuantity}</IndexTable.Cell>
        </IndexTable.Row>
      );
    });
  });

    return (
        <Page>
            <Layout>
                <Layout.Section>
                    <Card>
                        <IndexTable itemCount={rows.length} headings={[{title: 'Product'}, {title: 'Variant'}, {title: 'Inventory Quantity'}]}>

                        </IndexTable>
                    </Card>
                </Layout.Section>  
            </Layout>
        </Page>
    )

}