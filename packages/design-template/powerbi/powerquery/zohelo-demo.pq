// zohelo career desk: read a demo Gold table (Parquet over HTTPS) into Power BI.
// Paste into Power Query (Home -> Transform data -> New source -> Blank query -> Advanced editor), name it
// fnZoheloDemo, then call it per table, e.g. fnZoheloDemo("adventureworks", "fact_internet_sales").
// The base URL is fixed and the file path goes into RelativePath, so the Power BI service refreshes the
// dataset without a gateway (anonymous web source). manifest.json lists the models, tables, columns, row
// counts and the licence and attribution of each source.
// Endpoint: zohelo-data Deliverable "Power BI endpoint for the demo Gold tables" (not live yet; the host
// below is a placeholder until the owner picks it).
let
    BaseUrl = "https://DEMO-ENDPOINT-HOST/demo/v1/",
    Read = (model as text, table as text) as table =>
        let
            Source = Web.Contents(BaseUrl, [RelativePath = model & "/" & table & ".parquet"]),
            Result = Parquet.Document(Binary.Buffer(Source))
        in
            Result,
    Documented = Value.ReplaceType(
        Read,
        Value.ReplaceMetadata(
            Value.Type(Read),
            [
                Documentation.Name = "fnZoheloDemo",
                Documentation.LongDescription = "One demo Gold table of the zohelo career desk as a table. model: adventureworks, contoso, wwi, sap, ...; table: the Gold table name from manifest.json."
            ]
        )
    )
in
    Documented
