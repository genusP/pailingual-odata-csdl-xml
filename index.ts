import { csdl } from "pailingual-odata";

export function loadFromXml(xml: string): csdl.MetadataDocument {
    const document = new DOMParser()
        .parseFromString(xml, "text/xml");

    return read(document);
}
type ReadResult = { name: string, kind: csdl.CsdlKind  | undefined, result: any, childReaded?: boolean };

function copyAttributeValue<T, P extends keyof T>(elem: Element, attr: string, target: T, prop: P, convert?: (v: string)=>T[P]) {
    const a = elem.attributes.getNamedItem(attr);
    if (a)
        target[prop] = convert
            ? convert(a.value)
            : a.value as any;
}

function convertBoolean(v: string): boolean {
    return JSON.parse(v) === true;
}

function read(document: Document): csdl.MetadataDocument {
    const rootNode = document.firstElementChild;
    const versionAttr = rootNode.attributes.getNamedItem("Version");
    if (!versionAttr)
        throw new Error("Version attribute not found.")
    const version = versionAttr.value;
    if (version != "4.0" && version != "4.01")
        throw new Error("Not supported CSDL version");

    const metadataDocument: csdl.MetadataDocument = { $Version: version, $ApiRoot:"" }

    for (let item of readEachChild(rootNode)) {
        if (item.kind == csdl.CsdlKind.Namespace)
            metadataDocument[item.name] = item.result;
        else if (item.kind == csdl.CsdlKind.Reference) {
            let refobj = metadataDocument.$Reference = (metadataDocument.$Reference || {});
            refobj[item.name] = item.result;
        }
    }
    return metadataDocument;
}

function readActionImport(elem: Element): ReadResult {
    const name = elem.getAttribute("Name");
    const action = elem.getAttribute("Action");
    const result: csdl.ActionImport = { $Kind: csdl.CsdlKind.ActionImport, $Action: action };

    copyAttributeValue(elem, "EntitySet", result, "$EntitySet");

    return { name, kind: result.$Kind, result };
}

function readAnnotation(elem: Element): ReadResult {
    const term = elem.getAttribute("Term");
    let name = "@" + term
    const qualifierAttr = elem.attributes.getNamedItem("Qualifier");
    if (qualifierAttr)
        name += "#" + qualifierAttr.value;

    const additionalAttrs = Array.from(elem.attributes).filter(a => a.localName != "Term" && a.localName != "Qualifier");
    const results = additionalAttrs.map(a => readDynamicExpression(a)[0]);
    let resultFromAttrs: any = results.length == 0
        ? true
        : results.length == 1
            ? results[0].result
            : results.map(r => r.result);
    let resultFromChieldren: ReadResult[] = [];
    for (var i = 0; i < elem.childElementCount; i++) {
        resultFromChieldren.push(...readDynamicExpression(elem.children.item(i)));
    }

    const result: any = resultFromChieldren.length == 0
        ? resultFromAttrs
        : resultFromChieldren
            .reduce<Record<string, any>>((p, c) => {
                if (!c.name)
                    return c.result;
                p[c.name] = c.result;
                return p;
            }, {});
    return { name, kind: csdl.CsdlKind.Annotation, result, childReaded:true };
}

function readApply(elem: Element): ReadResult {
    const func = elem.getAttribute("Function");
    const result = { $Apply: [], $Function: func };
    for (var i = 0; i < elem.childElementCount; i++) {
        for (const item of readDynamicExpression(elem.children.item(i))) {
            if (item.kind == csdl.CsdlKind.Annotation)
                (result as any)[item.name] = item.result;
            else
                result.$Apply.push(item.name
                    ? { [item.name]: item.result }
                    : item.result);
        }
    }
    return {name: "", kind: undefined, result
    }
}

function readCast(elem: Element): ReadResult {
    const result: any = {};
    const operator = "$" + elem.localName;
    for (let i = 0; i < elem.attributes.length; i++) {
        const attr = elem.attributes.item(i);
        result["$" + attr.localName] = attr.value;
    }
    for (var i = 0; i < elem.childElementCount; i++) {
        let item = readDynamicExpression(elem.children.item(i))[0];
        result[item.name || operator] = item.result;
    }
    return { name: "", kind: undefined, result, childReaded: true };
}

function readCollection(elem: Element): ReadResult {
    const result: any[] = [];
    for (var i = 0; i < elem.childElementCount; i++) {
        for(const item of readDynamicExpression(elem.children.item(i)))
            result.push(item.result);
    }
    return { name: "", kind: undefined, result };
}

function readComplexType(elem: Element): ReadResult {
    const name = elem.getAttribute("Name");
    const result: csdl.ComplexType = { $Kind: csdl.CsdlKind.ComplexType };

    copyAttributeValue(elem, "BaseType", result, "$BaseType");
    copyAttributeValue(elem, "Abstract", result, "$Abstract", convertBoolean);
    copyAttributeValue(elem, "OpenType", result, "$OpenType", convertBoolean);

    for (let item of readEachChild(elem))
        result[item.name] = item.result;

    return { name, kind: result.$Kind, result }
}

function readDynamicExpression(node: Node): ReadResult[] {
    const element = node as Element;
    switch (node.nodeName.toUpperCase()) {
        case "ANNOTATION":
            return [readAnnotation(element)];
        case "COLLECTION":
            return [readCollection(element)];
        case "RECORD":
            return [readRecord(element)];
        case "LABELEDELEMENT":
            return [readLabeledElement(element)];
        case "ANNOTATIONPATH":
        case "LABELEDELEMENTREFERENCE":
        case "MODELELEMENTPATH":
        case "NAVIGATIONPROPERTYPATH":
        case "PROPERTYPATH":
        case "PATH":
        case "BINARY":
        case "DATE":
        case "DECIMAL":
        case "DURATION":
        case "GUID":
        case "TIMEOFDAY":
            return [readPathOrConstExpression(node)];
        case "DATETIMEOFFSET":
            return [{ name: "", kind: undefined, result: { "$DateTimeOffset": new Date(node.textContent).toISOString() }}]
        case "FLOAT":
            return [readFloatConstExpression(node)];
        case "BOOL":
            return [{ name: "", kind: undefined, result: convertBoolean(node.textContent.trim())  }];
        case "INT":
            return [{ name: "", kind: undefined, result: { "$Int": parseInt(node.textContent.trim()) } }];
        case "STRING":
            return [{ name: "", kind: undefined, result: node.textContent }];
        case "NULL":
            return [{
                name: "", kind: undefined, result: { "$Null": null }
            }];
        case "ENUMMEMBER":
            let result = node.textContent
                .split(" ")
                .map(_ => _.split("/")[1])
                .join(",");
            return [{ name: "", kind: undefined, result: { "$EnumMember":result } }]
        case "PROPERTYVALUE":
            return readPropertyValue(element);
        case "APPLY":
            return [readApply(element)];
        case "ISOF":
        case "CAST":
            return [readCast(element)];
        case "URLREF":
        case "IF":
        case "AND":
        case "OR":
        case "NOT":
        case "EQ":
        case "NE":
        case "GT":
        case "GE":
        case "LT":
        case "LE":
        case "HAS":
        case "IN":
        case "ADD":
        case "SUB":
        case "NEG":
        case "MUL":
        case "DIV":
        case "DIVBY":
        case "MOD":
            return [readDynamicExpressionOperators(element)];
        default:
            throw new Error(`Unknown element ${node.nodeName}`);
    }
}

function readDynamicExpressionOperators(elem: Element): ReadResult {
    const name = "$" + elem.localName;
    const chields = []
    const result: any = {};
    for (var i = 0; i < elem.childElementCount; i++) {
        const item = readDynamicExpression(elem.children.item(i))[0];
        if (item.kind == csdl.CsdlKind.Annotation)
            result[item.name] = item.result;
        else
            chields.push(item.name ? { [item.name]: item.result }: item.result);
    }
    result[name]=chields.length == 1 ? chields[0] : chields;
    return { name:"", kind: undefined, result, childReaded: true };
}

function readFloatConstExpression(node: Node): ReadResult {
    const content = node.textContent;
    const v = parseFloat(content);
    if (v)
        return { name: "", kind: undefined, result: v }
    else
        return { name: "$Float", kind: undefined, result: content };
}

function readFunctionImport(elem: Element): ReadResult {
    const name = elem.getAttribute("Name");
    const func = elem.getAttribute("Function");
    const result: csdl.FunctionImport = { $Kind: csdl.CsdlKind.FunctionImport, $Function: func };

    copyAttributeValue(elem, "EntitySet", result, "$EntitySet");
    copyAttributeValue(elem, "IncludeInServiceDocument", result, "$IncludeInServiceDocument");

    return { name, kind: result.$Kind, result };
}

function readEntityContainer(elem: Element): ReadResult {
    const name = elem.getAttribute("Name");
    const result: csdl.EntityContainer = { $Kind: csdl.CsdlKind.EntityContainer };

    copyAttributeValue(elem, "Extends", result, "$Extends");

    for (const item of readEachChild(elem))
        result[item.name] = item.result;

    return { name, kind: result.$Kind, result };
}

function readEntitySet(elem: Element): ReadResult {
    const name = elem.getAttribute("Name");
    const type = elem.getAttribute("EntityType");
    const result: csdl.EntitySet = { $Kind: csdl.CsdlKind.EntitySet, $Type: type };

    copyAttributeValue(elem, "IncludeInServiceDocument", result, "$IncludeInServiceDocument", convertBoolean);

    var navPropBindingsOrAnnotations = readEachChild(elem);
    if (navPropBindingsOrAnnotations.length > 0) {
        result.$NavigationPropertyBinding = {};
        for (var item of navPropBindingsOrAnnotations)
            if (item.name[0] == "@")
                result[item.name] = item.result;
            else
                result.$NavigationPropertyBinding[item.name] = item.result;
    }

    return { name, kind: result.$Kind, result, childReaded: true };
}

function readEntityType(elem: Element): ReadResult {
    const name = elem.getAttribute("Name");
    const result: csdl.EntityType = { $Kind: csdl.CsdlKind.EntityType };
    copyAttributeValue(elem, "BaseType", result, "$BaseType");
    copyAttributeValue(elem, "Abstract", result, "$Abstract", convertBoolean);
    copyAttributeValue(elem, "OpenType", result, "$OpenType", convertBoolean);
    copyAttributeValue(elem, "HasStream", result, "$HasStream", convertBoolean);
        
    for (let item of readEachChild(elem)) {
        result[item.name] = item.result;
    }

    return { name, kind: result.$Kind, result }
}

function readEnumMember(elem: Element): ReadResult {
    const name = elem.getAttribute("Name");
    const valueAttr = elem.attributes.getNamedItem("Value")
    const value = valueAttr && parseInt(valueAttr.value);
    return { name, kind: undefined, result: value };
}

function readEnumType(elem: Element): ReadResult {
    const name = elem.getAttribute("Name");
    const result: csdl.EnumType = { $Kind: csdl.CsdlKind.EnumType };

    copyAttributeValue(elem, "UnderlyingType", result, "$UnderlyingType")
    copyAttributeValue(elem, "IsFlags", result, "$IsFlags", convertBoolean);

    let pos = 0;
    for (var item of readEachChild(elem)) {
        if (item.kind !== csdl.CsdlKind.Annotation && !item.result)
            item.result = pos++;
        result[item.name] = item.result
    }

    return { name, kind: result.$Kind, result, childReaded: true }
}

function readEachChild(element: Element): ReadResult[] {
    var result: ReadResult[] = [];
    for (let i = 0; i < element.childElementCount; i++) {
        let readResult: ReadResult;
        const chield = element.children.item(i);
        switch (chield.localName.toUpperCase()) {
            case "REFERENCE":
                readResult=readReference(chield);
                break;
            case "INCLUDE":
                readResult = readInclude(chield);
                break;
            case "INCLUDEANNOTATIONS":
                readResult = readIncludeAnnotations(chield);
                break;
            case "DATASERVICES":
                result.push(...readEachChild(chield));
                continue;
            case "SCHEMA":
                readResult =readSchema(chield);
                break;
            case "ENTITYTYPE":
                readResult = readEntityType(chield);
                break;
            case "KEY":
                readResult = readKey(chield);
                break;
            case "PROPERTY":
                readResult = readProperty(chield);
                break;
            case "NAVIGATIONPROPERTY":
                readResult = readNavigationProperty(chield);
                break;
            case "COMPLEXTYPE":
                readResult = readComplexType(chield);
                break;
            case "ENUMTYPE":
                readResult = readEnumType(chield);
                break;
            case "MEMBER":
                readResult = readEnumMember(chield);
                break;
            case "ACTION":
            case "FUNCTION":
                readResult = readOperation(chield);
                break;
            case "ENTITYCONTAINER":
                readResult = readEntityContainer(chield);
                break;
            case "ENTITYSET":
                readResult = readEntitySet(chield);
                break;
            case "SINGLETON":
                readResult = readSingleton(chield);
                break;
            case "NAVIGATIONPROPERTYBINDING":
                readResult = readNavigationPropertyBinding(chield);
                break;
            case "ACTIONIMPORT":
                readResult = readActionImport(chield);
                break;
            case "FUNCTIONIMPORT":
                readResult = readFunctionImport(chield);
                break;
            case "TYPEDEFINITION":
                readResult = readTypeDefinition(chield);
                break;
            case "TERM": break;
            case "ANNOTATION":
                readResult = readAnnotation(chield);
                break;
            default:
                throw new Error("Unknown element, " + chield.localName);
        }

        result.push(readResult);
        if (chield.childElementCount> 0 && readResult.childReaded !== true) {
            for (let item of readEachChild(chield))
                if (readResult.result && typeof readResult.result == "object")
                    readResult.result[item.name] = item.result;
                else
                    result.push({ name: readResult.name + item.name, kind: item.kind, result: item.result });
        }
    }
    return result;
}

function readInclude(elem: Element): ReadResult {
    const ns = elem.getAttribute("Namespace");
    const result: csdl.Include = { $Namespace: ns };
    copyAttributeValue(elem, "Alias", result, "$Alias");
    return { name: "$Include", kind: undefined, result }
}

function readIncludeAnnotations(elem: Element): ReadResult {
    const termNs = elem.getAttribute("TermNamespace");
    const result: csdl.IncludeAnnotation = { $TermNamespace: termNs };

    copyAttributeValue(elem, "Qualifier", result, "$Qualifier");
    copyAttributeValue(elem, "TargetNamespace", result, "$TargetNamespace");

    return { name: "$IncludeAnnotations", kind: undefined, result };
}

function readKey(elem: Element): ReadResult {
    const result: csdl.KeyItem[] = [];
    for (var i = 0; i < elem.childElementCount; i++) {
        const chield = elem.children.item(i);
        const name = chield.attributes.getNamedItem("Name").value;
        const aliasAttr = chield.attributes.getNamedItem("Alias");

        result.push(aliasAttr
            ? { [aliasAttr.value]: name }
            : name );
    }
    return { name: "$Key", kind: undefined, result, childReaded: true };
}

function readLabeledElement(elem: Element): ReadResult {
    const name = elem.getAttribute("Name");
    const nodes = Array.from<Node>(elem.attributes).filter(a => a.nodeName !== "Name")
        .concat(Array.from<Node>(elem.children));
    const result= { $LabeledElement: null, $Name: name };
    for (let n of nodes) {
        for (const r of readDynamicExpression(n)) {
            if (r.kind == csdl.CsdlKind.Annotation)
                (result as any)[r.name] = r.result;
            else
                result.$LabeledElement = r.name
                    ? { [r.name]: r.result }
                    : r.result;
        }
    }
    return { name: "", kind: undefined, result };
}

function readNavigationProperty(elem: Element): ReadResult {
    const name = elem.getAttribute("Name");
    const type = elem.getAttribute("Type");

    const result: csdl.NavigationProperty = { $Kind: csdl.CsdlKind.NavigationProperty, $Type: unwrapType(type) };
    if (type !== result.$Type)
        result.$Collection = true;

    const nullableAttr = elem.attributes.getNamedItem("Nullable");
    result.$Nullable = nullableAttr === undefined || nullableAttr === null || nullableAttr.value.toLowerCase() === "true";
    copyAttributeValue(elem, "Partner", result, "$Partner");
    copyAttributeValue(elem, "ContainsTarget", result, "$ContainsTarget", convertBoolean);

    for (var i = 0; i < elem.childElementCount; i++) {
        const chield = elem.children.item(i);
        if (chield.tagName.toUpperCase() === "ONDELETE") {
            result.$OnDelete = chield.attributes.getNamedItem("Action").value as any;
            for (let item of readEachChild(chield)) //Annotations
                result["$OnDelete" + item.name] = item.result;
        }
        else if (chield.tagName.toUpperCase() === "REFERENTIALCONSTRAINT") {
            const targ = result.$ReferentialConstraint = (result.$ReferentialConstraint || {});
            const property = chield.attributes.getNamedItem("Property").value;
            targ[property] = chield.attributes.getNamedItem("ReferencedProperty").value;
            for (let item of readEachChild(chield)) //Annotations
                targ[property+item.name] = item.result;
        }
    }

    return { name, kind: result.$Kind, result, childReaded: true };
}

function readNavigationPropertyBinding(elem: Element): ReadResult {

    const path = elem.getAttribute("Path");
    const target = elem.getAttribute("Target");
    return { name: path, kind: undefined, result: target };
}

function readOperation(elem: Element): ReadResult {
    const name = elem.getAttribute("Name");
    const kind = elem.tagName.toUpperCase() == "ACTION" ? csdl.CsdlKind.Action : csdl.CsdlKind.Function;
    const result: csdl.ActionOverload | csdl.FunctionOverload = { $Kind: kind } as any;

    copyAttributeValue(elem, "IsBound", result, "$IsBound", convertBoolean);
    copyAttributeValue(elem, "EntitySetPath", result, "$EntitySetPath");

    for (var i = 0; i < elem.childElementCount; i++) {
        const chield = elem.children.item(i);
        if (chield.tagName.toUpperCase() === "RETURNTYPE") {
            result.$ReturnType = {};
            readTypeReference(chield, result.$ReturnType);
            for (let item of readEachChild(chield)) //Annotations
                result.$ReturnType[item.name] = item.result;
        }
        else if (chield.tagName.toUpperCase() === "PARAMETER") {
            const paramName = chield.attributes.getNamedItem("Name").value;
            const parameter: csdl.Parameter = { $Name: paramName };
            readTypeReference(chield, parameter);
            (result.$Parameter = (result.$Parameter || []))
                .push(parameter);
            for (let item of readEachChild(chield)) //Annotations
                parameter[item.name] = item.result;
        }
    }

    return { name, kind, result, childReaded: true };
}

function readPathOrConstExpression(node: Node): ReadResult {
    return {
        name: "",
        kind: undefined,
        result: { ["$" + node.nodeName]: node.textContent } };
}

function readProperty(elem: Element): ReadResult {
    const name = elem.getAttribute("Name");
    const result: csdl.Property = { $Kind: csdl.CsdlKind.Property };

    readTypeReference(elem, result);
    copyAttributeValue(elem, "DefaultValue", result, "$DefaultValue");

    return { name, kind: result.$Kind, result };
}

function readPropertyValue(elem: Element): ReadResult[] {
    const prop = elem.getAttribute("Property");
    const nodes = Array.from<Node>(elem.attributes).filter(a => a.nodeName !== "Property")
        .concat(Array.from<Node>(elem.children));

    const result: ReadResult[]=[];
    for (let n of nodes) {
        for (let r of readDynamicExpression(n)) {
            r.name = prop + r.name;
            result.push(r);
        }
    }
    return result
}

function readRecord(elem: Element): ReadResult {
    const result:any = {};
    for (var i = 0; i < elem.childElementCount; i++) {
        for(const item of readDynamicExpression(elem.children.item(i)))
            result[item.name] = item.result;
    }
    return { name: "", kind: undefined, result };
}

function readReference(elem: Element): ReadResult{
    const name = elem.getAttribute("Uri");
    const result: csdl.ReferenceObject = {};

    for (let item of readEachChild(elem)) {
        const array:any[] = item.name === "$Include"
            ? (result.$Include = result.$Include || [])
            : (result.$IncludeAnnotations = result.$IncludeAnnotations || [])
        array.push(item.result);
    }

    return { name, kind: csdl.CsdlKind.Reference, result, childReaded:true };
}

function readSchema(elem: Element): ReadResult {
    const name = elem.getAttribute("Namespace");
    const result: csdl.Namespace = {};
    const aliasAttr = elem.attributes.getNamedItem("Alias");
    if (aliasAttr)
        result.$Alias = aliasAttr.value;
    for (let item of readEachChild(elem)) {
        if (item.kind === csdl.CsdlKind.Action || item.kind === csdl.CsdlKind.Function)
            (result[item.name] = (result[item.name] as Array<any> || [])).push(item.result);
        else
            result[item.name] = item.result;
    }
    return { name, kind: csdl.CsdlKind.Namespace, result, childReaded: true };
}

function readSingleton(elem: Element): ReadResult {
    const name = elem.getAttribute("Name");
    const type = elem.getAttribute("Type");
    const result: csdl.Singleton = { $Kind: csdl.CsdlKind.Singleton, $Type: type };

    var navPropBindings = readEachChild(elem);
    if (navPropBindings.length > 0) {
        result.$NavigationPropertyBinding = {};
        for (var binding of navPropBindings)
            result.$NavigationPropertyBinding[binding.name] = binding.result;
    }

    return { name, kind: result.$Kind, result, childReaded: true };
}

function readTypeDefinition(elem: Element): ReadResult {
    const name = elem.getAttribute("Name");
    const underlyingType = elem.getAttribute("UnderlyingType");
    const result: csdl.TypeDefinition = { $Kind: csdl.CsdlKind.TypeDefinition, $UnderlyingType: underlyingType }

    copyAttributeValue(elem, "MaxLength", result, "$MaxLength", v => parseInt(v));
    copyAttributeValue(elem, "Unicode", result, "$Unicode", convertBoolean);
    copyAttributeValue(elem, "Precision", result, "$Precision", v => parseInt(v));
    copyAttributeValue(elem, "Scale", result, "$Scale");
    copyAttributeValue(elem, "SRID", result, "$SRID");
    return { name, kind: csdl.CsdlKind.TypeDefinition, result };
}

function readTypeReference(elem: Element, target: csdl.TypeReference) {
    let type = elem.getAttribute("Type");
    target.$Type = unwrapType(type);
    if (type !== target.$Type)
        target.$Collection = true;
    const nullableAttr = elem.attributes.getNamedItem("Nullable");
    target.$Nullable = nullableAttr === undefined || nullableAttr === null || nullableAttr.value.toLowerCase() === "true";
    copyAttributeValue(elem, "MaxLength", target, "$MaxLength", parseInt);
    copyAttributeValue(elem, "Precision", target, "$Precision", parseInt);
    copyAttributeValue(elem, "Sacle", target, "$Scale");
    copyAttributeValue(elem, "Unicode", target, "$Unicode", convertBoolean);
    copyAttributeValue(elem, "SRID", target, "$SRID");
}

function unwrapType(type: string): string {
    if (type.startsWith("Collection(")) {
        return type.substring(11, type.length - 1);
    }
    return type;
}