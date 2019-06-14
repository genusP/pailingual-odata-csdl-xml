# pailingual-odata-csdl-xml

This library implements reading XML metadata document for [pailingual-odata](https://www.npmjs.com/package/pailingual-odata).


# Install
```bash
npm --save pailingual-odata-filter
```

# Usage

```ts
import { loadFromXml } from "pailingual-odata-csdl-xml";
import { Pailingual } from "pailingual-odata";

const xml = getMetadataXml(); //getting XML metadata document from some source
var apiMetadata = loadFromXml(xml);
const context = Pailingual.createApiContext<IMyContext>(apiMetadata);
```