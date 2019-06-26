import { assert } from "chai";
import { loadFromXml } from "../index";
import { csdl } from "pailingual-odata";
import { MetadataDocument } from "pailingual-odata/dist/esm/csdl";

if (typeof window === 'undefined') {
    require('jsdom-global')();
    (global as any).DOMParser = (window as any).DOMParser;
}

describe("", () => {
    it("Load metadata from XML", () => {
        const xml = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx"
           Version="4.0">
  <edmx:Reference Uri="http://docs.oasis-open.org/odata/odata/v4.0/os/vocabularies/Org.OData.Core.V1.xml">
    <edmx:Include Namespace="Org.OData.Core.V1" Alias="Core">
      <Annotation Term="Core.DefaultNamespace" />
    </edmx:Include>
  </edmx:Reference>
  <edmx:Reference Uri="http://docs.oasis-open.org/odata/odata/v4.0/os/vocabularies/Org.OData.Measures.V1.xml">
    <edmx:Include Alias="Measures" Namespace="Org.OData.Measures.V1" />
  </edmx:Reference>
  <edmx:Reference Uri="http://odata.org/ann/b">
    <edmx:IncludeAnnotations TermNamespace="org.example.validation" />
    <edmx:IncludeAnnotations TermNamespace="org.example.display"
                             Qualifier="Tablet" />
    <edmx:IncludeAnnotations TermNamespace="org.example.hcm" 
                             TargetNamespace="com.example.Sales" />
    <edmx:IncludeAnnotations TermNamespace="org.example.hcm"
                             Qualifier="Tablet"
                             TargetNamespace="com.example.Person" />
  </edmx:Reference>
  <edmx:DataServices>
    <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" 
            Namespace="ODataDemo">
      <EntityType Name="Product" HasStream="true">
        <Key>
          <PropertyRef Name="ID" />
        </Key>
        <Property Name="ID" Type="Edm.Int32" Nullable="false" />
        <Property Name="Description" Type="Edm.String" >
          <Annotation Term="Core.IsLanguageDependent" />
        </Property>
        <Property Name="ReleaseDate" Type="Edm.Date" />
        <Property Name="DiscontinuedDate" Type="Edm.Date" />
        <Property Name="Rating" Type="Edm.Int32" />
        <Property Name="Price" Type="Edm.Decimal" Scale="variable">
          <Annotation Term="Measures.ISOCurrency" Path="Currency" />
        </Property>
        <Property Name="Currency" Type="Edm.String" MaxLength="3" />
        <NavigationProperty Name="Category" Type="ODataDemo.Category"
                            Nullable="false" Partner="Products" />
        <NavigationProperty Name="Supplier" Type="ODataDemo.Supplier"
                            Partner="Products" />
      </EntityType>
      <TypeDefinition Name="FilePath" UnderlyingType="Edm.String" MaxLength="255" Unicode="true">
        <Annotation Term="Core.Description" String="description text"/>
      </TypeDefinition>
    <EnumType Name="ShippingMethod">
        <Annotation Term="Core.Description"
                    String="Method of shipping" />
        <Member Name="FirstClass">
            <Annotation Term="Core.Description"
                        String="Shipped with highest priority" />
        </Member>
        <Member Name="TwoDay">
            <Annotation Term="Core.Description"
                        String="Shipped within two days" />
        </Member>
        <Member Name="Overnight">
            <Annotation Term="Core.Description"
                        String="Shipped overnight" />
        </Member>
    </EnumType>
      <EntityType Name="Category">
        <Key>
         <PropertyRef Name="ID" />
        </Key>
        <Property Name="ID" Type="Edm.Int32" Nullable="false" />
        <Property Name="Name" Type="Edm.String">
          <Annotation Term="Core.IsLanguageDependent" />
        </Property>
        <NavigationProperty Name="Products" Partner="Category"
                            Type="Collection(ODataDemo.Product)">
          <OnDelete Action="Cascade" >
               <Annotation Term="Core.Description" 
                  String="Delete all products in this category" />
          </OnDelete>
        </NavigationProperty>
      </EntityType>
      <EntityType Name="Supplier">
        <Key>
          <PropertyRef Name="ID" />
        </Key>
        <Property Name="ID" Type="Edm.String" Nullable="false" />
        <Property Name="Name" Type="Edm.String" />
        <Property Name="Address" Type="ODataDemo.Address" Nullable="false" />
        <Property Name="Concurrency" Type="Edm.Int32" Nullable="false" />
        <NavigationProperty Name="Products" Partner="Supplier"
                            Type="Collection(ODataDemo.Product)" />
      </EntityType>
      <EntityType Name="Country">
        <Key>
          <PropertyRef Name="Code" />
        </Key>
        <Property Name="Code" Type="Edm.String" MaxLength="2" 
                              Nullable="false" />
        <Property Name="Name" Type="Edm.String" />
      </EntityType>
      <ComplexType Name="Address">
        <Property Name="Street" Type="Edm.String" />
        <Property Name="City" Type="Edm.String" />
        <Property Name="State" Type="Edm.String" />
        <Property Name="ZipCode" Type="Edm.String" />
        <Property Name="CountryName" Type="Edm.String" />
        <NavigationProperty Name="Country" Type="ODataDemo.Country">
          <ReferentialConstraint Property="CountryName"  
                                 ReferencedProperty="Name" />
        </NavigationProperty>
      </ComplexType>
      <Function Name="ProductsByRating">
        <Parameter Name="Rating" Type="Edm.Int32" />
        <ReturnType Type="Collection(ODataDemo.Product)" />
      </Function>
      <EntityContainer Name="DemoService">
        <EntitySet Name="Products" EntityType="ODataDemo.Product">
          <NavigationPropertyBinding Path="Category" Target="Categories" />
        </EntitySet>
        <EntitySet Name="Categories" EntityType="ODataDemo.Category">
          <NavigationPropertyBinding Path="Products" Target="Products" />
        </EntitySet>
        <EntitySet Name="Suppliers" EntityType="ODataDemo.Supplier">
          <NavigationPropertyBinding Path="Products" Target="Products" />
          <NavigationPropertyBinding Path="Address/Country"
                                     Target="Countries" />
          <Annotation Term="Core.OptimisticConcurrency">
            <Collection>
              <PropertyPath>Concurrency</PropertyPath>
            </Collection>
          </Annotation>
        </EntitySet>
        <Singleton Name="MainSupplier" Type="ODataDemo.Supplier">
          <NavigationPropertyBinding Path="Products" Target="Products" />
        </Singleton>
        <EntitySet Name="Countries" EntityType="ODataDemo.Country" />
        <FunctionImport Name="ProductsByRating" EntitySet="Products"
                        Function="ODataDemo.ProductsByRating" />
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>
`;
        var actual = loadFromXml(xml);

        var expected: MetadataDocument = {
            $ApiRoot:"",
            "$Version": "4.0",
            //"$EntityContainer": "ODataDemo.DemoService",
            "$Reference": {
                "http://docs.oasis-open.org/odata/odata/v4.0/os/vocabularies/Org.OData.Core.V1.xml": {
                    $Include: [{
                        $Namespace: "Org.OData.Core.V1",
                        $Alias: "Core",
                        "@Core.DefaultNamespace": true
                    }]
                },
                "http://docs.oasis-open.org/odata/odata/v4.0/os/vocabularies/Org.OData.Measures.V1.xml": {
                    $Include: [{
                        $Namespace: "Org.OData.Measures.V1",
                        $Alias:"Measures"
                    }]
                },
                "http://odata.org/ann/b": {
                    "$IncludeAnnotations": [
                        {
                            "$TermNamespace": "org.example.validation"
                        },
                        {
                            "$TermNamespace": "org.example.display",
                            "$Qualifier": "Tablet"
                        },
                        {
                            "$TermNamespace": "org.example.hcm",
                            "$TargetNamespace": "com.example.Sales"
                        },
                        {
                            "$TermNamespace": "org.example.hcm",
                            "$Qualifier": "Tablet",
                            "$TargetNamespace": "com.example.Person"
                        }
                    ]
                }
            },
            "ODataDemo": {
                "Product": {
                    "$Kind": "EntityType",
                    "$HasStream": true,
                    "$Key": [
                        "ID"
                    ],
                    "ID": { $Kind: csdl.CsdlKind.Property, $Type: "Edm.Int32", $Nullable: false },
                    "Description": {
                        $Kind: csdl.CsdlKind.Property,
                        $Type: "Edm.String",
                        $Nullable: true,
                        "@Core.IsLanguageDependent": true
                    },
                    "ReleaseDate": { $Kind: csdl.CsdlKind.Property, "$Type": "Edm.Date", $Nullable: true },
                    "DiscontinuedDate": { $Kind: csdl.CsdlKind.Property, "$Type": "Edm.Date", $Nullable: true},
                    "Rating": { $Kind: csdl.CsdlKind.Property, "$Type": "Edm.Int32", $Nullable: true},
                    "Price": {
                        $Kind: csdl.CsdlKind.Property,
                        "$Type": "Edm.Decimal",
                        $Nullable: true,
                        "@Measures.ISOCurrency" : { $Path: "Currency"   }
                    },
                    "Currency": { $Kind: csdl.CsdlKind.Property, "$MaxLength": 3, $Type: "Edm.String", $Nullable: true},
                    "Category": { "$Kind": "NavigationProperty", "$Type": "ODataDemo.Category", "$Partner": "Products", $Nullable: false },
                    "Supplier": { "$Kind": "NavigationProperty", "$Type": "ODataDemo.Supplier", "$Partner": "Products", $Nullable: true }
                },
                "FilePath": {
                    $Kind: csdl.CsdlKind.TypeDefinition,
                    $UnderlyingType: "Edm.String",
                    $MaxLength: 255,
                    $Unicode: true,
                    "@Core.Description":"description text"
                },
                "ShippingMethod": {
                    "$Kind": "EnumType",
                    "FirstClass": 0,
                    "FirstClass@Core.Description": "Shipped with highest priority",
                    "TwoDay": 1,
                    "TwoDay@Core.Description": "Shipped within two days",
                    "Overnight": 2,
                    "Overnight@Core.Description": "Shipped overnight",
                    "@Core.Description": "Method of shipping"
                },
                "Category": {
                    "$Kind": "EntityType",
                    "$Key": [
                        "ID"
                    ],
                    "ID": { $Kind: csdl.CsdlKind.Property, "$Type": "Edm.Int32", $Nullable: false },
                    "Name": {
                        $Kind: csdl.CsdlKind.Property,
                        $Type: "Edm.String",
                        $Nullable: true,
                        "@Core.IsLanguageDependent":true
                    },
                    "Products": {
                        "$Kind": "NavigationProperty",
                        $Nullable: true,
                        "$Partner": "Category",
                        "$Collection": true,
                        "$Type": "ODataDemo.Product",
                        "$OnDelete": "Cascade",
                        "$OnDelete@Core.Description":"Delete all products in this category"
                    }
                },
                "Supplier": {
                    "$Kind": "EntityType",
                    "$Key": [
                        "ID"
                    ],
                    "ID": { $Kind: csdl.CsdlKind.Property, $Type: "Edm.String", "$Nullable": false},
                    "Name": { $Kind: csdl.CsdlKind.Property, $Type: "Edm.String", $Nullable: true },
                    "Address": { $Kind: csdl.CsdlKind.Property, "$Type": "ODataDemo.Address", "$Nullable": false },
                    "Concurrency": { $Kind: csdl.CsdlKind.Property, "$Type": "Edm.Int32", $Nullable: false },
                    "Products": { "$Kind": "NavigationProperty", $Nullable: true, "$Partner": "Supplier", "$Collection": true, "$Type": "ODataDemo.Product" }
                },
                "Country": {
                    "$Kind": "EntityType",
                    "$Key": [
                        "Code"
                    ],
                    "Code": { $Kind: csdl.CsdlKind.Property, $Type: "Edm.String", "$MaxLength": 2, $Nullable: false },
                    "Name": { $Kind: csdl.CsdlKind.Property, $Type: "Edm.String", $Nullable: true}
                },
                "Address": {
                    "$Kind": "ComplexType",
                    "Street": { $Kind: csdl.CsdlKind.Property, $Type: "Edm.String", $Nullable: true },
                    "City": { $Kind: csdl.CsdlKind.Property, $Type: "Edm.String", $Nullable: true},
                    "State": { $Kind: csdl.CsdlKind.Property, $Type: "Edm.String", $Nullable: true},
                    "ZipCode": { $Kind: csdl.CsdlKind.Property, $Type: "Edm.String", $Nullable: true},
                    "CountryName": { $Kind: csdl.CsdlKind.Property, $Type: "Edm.String", $Nullable: true},
                    "Country": {
                        "$Kind": "NavigationProperty",
                        "$Type": "ODataDemo.Country",
                        $Nullable: true,
                        "$ReferentialConstraint": {
                            "CountryName": "Name"
                        }
                    }
                },
                "ProductsByRating": [
                    {
                        "$Kind": "Function",
                        "$Parameter": [
                            {
                                "$Name": "Rating",
                                $Nullable: true,
                                "$Type": "Edm.Int32"
                            }
                        ],
                        "$ReturnType": {
                            "$Collection": true,
                            $Nullable: true,
                            "$Type": "ODataDemo.Product"
                        }
                    }
                ],
                "DemoService": {
                    "$Kind": "EntityContainer",
                    "Products": {
                        "$Kind": "EntitySet",
                        "$Type": "ODataDemo.Product",
                        "$NavigationPropertyBinding": {
                            "Category": "Categories"
                        }
                    },
                    "Categories": {
                        "$Kind": "EntitySet",
                        "$Type": "ODataDemo.Category",
                        "$NavigationPropertyBinding": {
                            "Products": "Products"
                        },
                    },
                    "Suppliers": {
                        "$Kind": "EntitySet",
                        "$Type": "ODataDemo.Supplier",
                        "$NavigationPropertyBinding": {
                            "Products": "Products",
                            "Address/Country": "Countries"
                        },
                        "@Core.OptimisticConcurrency": [{$PropertyPath:"Concurrency"}]
                    },
                    "Countries": {
                        "$Kind": "EntitySet",
                        "$Type": "ODataDemo.Country"
                    },
                    "MainSupplier": {
                        "$Kind": "Singleton",
                        "$Type": "ODataDemo.Supplier",
                        "$NavigationPropertyBinding": {
                            "Products": "Products"
                        }
                    },
                    "ProductsByRating": {
                        "$Kind": "FunctionImport",
                        "$EntitySet": "Products",
                        "$Function": "ODataDemo.ProductsByRating"
                    }
                }
            } as csdl.Namespace
        }

            assert.deepEqual(actual, expected);
    });


    it("paths", () => {
        const xml = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <edmx:DataServices>
        <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" 
                Namespace="ODataTest">
            <EntityType Name="Annotable">
                <Annotation Term="UI.HyperLink" NavigationPropertyPath="Supplier" />
                
                <Annotation Term="org.example.MyFavoriteModelElement" 
                            ModelElementPath="/org.example.someAction" /> 
                <Annotation Term="UI.ReferenceFacet"
                            AnnotationPath="Product/Supplier/@UI.LineItem" /> 
 
                <Annotation Term="UI.CollectionFacet" Qualifier="Contacts"> 
                  <Collection> 
                    <AnnotationPath>Supplier/@Communication.Contact</AnnotationPath> 
                    <AnnotationPath>Customer/@Communication.Contact</AnnotationPath> 
                  </Collection> 
                </Annotation>
            </EntityType>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

        const expected: csdl.MetadataDocument = {
            $ApiRoot: "",
            $Version: "4.0",
            "ODataTest": {
                "Annotable": {
                    $Kind: csdl.CsdlKind.EntityType,                    
                    "@UI.HyperLink": {
                        "$NavigationPropertyPath": "Supplier"
                    },

                    "@org.example.MyFavoriteModelElement": {
                        "$ModelElementPath": "/org.example.someAction"
                    },
                    "@UI.ReferenceFacet": {
                        "$AnnotationPath": "Product/Supplier/@UI.LineItem"
                    },
                    "@UI.CollectionFacet#Contacts": [
                        {
                            "$AnnotationPath": "Supplier/@Communication.Contact"
                        },
                        {
                            "$AnnotationPath": "Customer/@Communication.Contact"
                        }
                    ]
                }
            }
        }

        const actual = loadFromXml(xml);

        assert.deepEqual(actual, expected);
    })

    it("record", () => {
        const xml = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <edmx:DataServices>
        <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" 
                Namespace="ODataTest">
            <EntityType Name="Annotable">
                <Annotation Term="Capabilities.UpdateRestriction">
                    <Record>
                        <PropertyValue Property="NonUpdatableNavigationProperties">
                            <NavigationPropertyPath>Supplier</NavigationPropertyPath>
                        </PropertyValue>
                        <Annotation Term="Core.Description" ><String>Description text</String></Annotation>
                    </Record>
                </Annotation>                
            </EntityType>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

        const expected: csdl.MetadataDocument = {
            $ApiRoot: "",
            $Version: "4.0",
            "ODataTest": {
                "Annotable": {
                    $Kind: csdl.CsdlKind.EntityType,
                    "@Capabilities.UpdateRestriction": {
                        "@Core.Description": "Description text",
                        "NonUpdatableNavigationProperties": 
                            { "$NavigationPropertyPath": "Supplier" }
                    }
                }
            }
        }

        const actual = loadFromXml(xml);

        assert.deepEqual(actual, expected);
    })

    it("apply", () => {
        const xml = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <edmx:DataServices>
        <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" 
                Namespace="ODataTest">
            <EntityType Name="Annotable">
                <Annotation Term="org.example.display.DisplayName">
                  <Apply Function="odata.concat">
                    <String>Product: </String>
                    <Path>ProductName</Path>
                    <Annotation Term="Core.Description" String="description text" />
                  </Apply>
                </Annotation>
            </EntityType>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;
        const actual = loadFromXml(xml);

        const expected: csdl.MetadataDocument = {
            $ApiRoot: "", $Version: "4.0",
            "ODataTest": {
                "Annotable": {
                    $Kind: csdl.CsdlKind.EntityType,
                    "@org.example.display.DisplayName": {
                        "$Apply": [
                            "Product: ",
                            {
                                "$Path": "ProductName"
                            }
                        ],
                        "$Function": "odata.concat",
                        "@Core.Description": "description text"
                    }
                }
            }
        }

        assert.deepEqual(actual, expected);
    })

    it("logical operators", () => {
            const xml = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <edmx:DataServices>
        <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" 
                Namespace="ODataTest">
            <EntityType Name="Annotable">
                <Annotation Term="logical.operators">
                    <Collection>
                    <And>
                      <Path>IsMale</Path>
                      <Path>IsMarried</Path>
                      <Annotation Term="Core.Description" String="Operation description" />
                    </And>
                    <Or>
                      <Path>IsMale</Path>
                      <Path>IsMarried</Path>
                    </Or>
                    <Not>
                      <Path>IsMale</Path>
                    </Not>
                    <Eq>
                      <Null />
                      <Path>IsMale</Path>
                    </Eq>
                    <Ne>
                      <Null />
                      <Path>IsMale</Path>
                    </Ne>
                    <Gt>
                      <Path>Price</Path>
                      <Int>20</Int>
                    </Gt>
                    <Ge>
                      <Path>Price</Path>
                      <Int>10</Int>
                    </Ge>
                    <Lt>
                      <Path>Price</Path>
                      <Int>20</Int>
                    </Lt>
                    <Le>
                      <Path>Price</Path>
                      <Int>100</Int>
                    </Le>
                    <Has>
                      <Path>Fabric</Path>
                      <EnumMember>org.example.Pattern/Red</EnumMember>
                    </Has>
                    <In>
                      <Path>Size</Path>
                      <Collection>
                        <String>XS</String>
                        <String>S</String>
                      </Collection>
                    </In>
                    </Collection>
                </Annotation>
            </EntityType>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;
            const actual = loadFromXml(xml);

            const expected: csdl.MetadataDocument = {
                $ApiRoot: "", $Version: "4.0",
                "ODataTest": {
                    "Annotable": {
                        $Kind: csdl.CsdlKind.EntityType,
                        "@logical.operators": [
                            {
                                "$And": [
                                    {
                                        "$Path": "IsMale"
                                    },
                                    {
                                        "$Path": "IsMarried"
                                    }
                                ],
                                "@Core.Description":"Operation description"
                            },
                            {
                                "$Or": [
                                    {
                                        "$Path": "IsMale"
                                    },
                                    {
                                        "$Path": "IsMarried"
                                    }
                                ]
                            },
                            {
                                "$Not": {
                                    "$Path": "IsMale"
                                }
                            },
                            {
                                "$Eq": [
                                    { $Null: null },
                                    {
                                        "$Path": "IsMale"
                                    }
                                ]
                            },
                            {
                                "$Ne": [
                                    { $Null: null },
                                    {
                                        "$Path": "IsMale"
                                    }
                                ]
                            },
                            {
                                "$Gt": [
                                    {
                                        "$Path": "Price"
                                    },
                                    {
                                        "$Int": 20
                                    }
                                ]
                            },
                            {
                                "$Ge": [
                                    {
                                        "$Path": "Price"
                                    },
                                    {
                                        "$Int": 10
                                    }
                                ]
                            },
                            {
                                "$Lt": [
                                    {
                                        "$Path": "Price"
                                    },
                                    {
                                        "$Int": 20
                                    }
                                ]
                            },
                            {
                                "$Le": [
                                    {
                                        "$Path": "Price"
                                    },
                                    {
                                        "$Int": 100
                                    }
                                ]
                            },
                            {
                                "$Has": [
                                    {
                                        "$Path": "Fabric"
                                    },
                                    {
                                        "$EnumMember": "Red"
                                    }
                                ]
                            },
                            {
                                "$In": [
                                    {
                                        "$Path": "Size"
                                    },
                                    [
                                        "XS",
                                        "S"
                                    ]
                                ]
                            }
                        ]
                    }
                }
            }

            assert.deepEqual(actual, expected);
        });

    it("arithmetic operators", () => {
            const xml = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <edmx:DataServices>
        <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" 
                Namespace="ODataTest">
            <EntityType Name="Annotable">
                <Annotation Term="arithmetic.operators">
                    <Collection>
                        <Add>
                          <Path>StartDate</Path>
                          <Path>Duration</Path>
                          <Annotation Term="Core.Description" String="Operation description" />
                        </Add>
                        <Sub>
                          <Path>Revenue</Path>
                          <Path>Cost</Path>
                        </Sub>
                        <Neg>
                          <Path>Height</Path>
                        </Neg>
                        <Mul>
                          <Path>NetPrice</Path>
                          <Path>TaxRate</Path>
                        </Mul>
                        <Div>
                          <Path>Quantity</Path>
                          <Path>QuantityPerParcel</Path>
                        </Div>
                        <DivBy>
                          <Path>Quantity</Path>
                          <Path>QuantityPerParcel</Path>
                        </DivBy>
                        <Mod>
                          <Path>Quantity</Path>
                          <Path>QuantityPerParcel</Path>
                        </Mod>
                    </Collection>
                </Annotation>
            </EntityType>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;
            const actual = loadFromXml(xml);

            const expected: csdl.MetadataDocument = {
                $ApiRoot: "", $Version: "4.0",
                "ODataTest": {
                    "Annotable": {
                        $Kind: csdl.CsdlKind.EntityType,
                        "@arithmetic.operators": [
                            {
                                "$Add": [
                                    {
                                        "$Path": "StartDate"
                                    },
                                    {
                                        "$Path": "Duration"
                                    }
                                ],
                                "@Core.Description":"Operation description"
                            },
                            {
                                "$Sub": [
                                    {
                                        "$Path": "Revenue"
                                    },
                                    {
                                        "$Path": "Cost"
                                    }
                                ]
                            },
                            {
                                "$Neg": {
                                    "$Path": "Height"
                                }
                            },
                            {
                                "$Mul": [
                                    {
                                        "$Path": "NetPrice"
                                    },
                                    {
                                        "$Path": "TaxRate"
                                    }
                                ]
                            },
                            {
                                "$Div": [
                                    {
                                        "$Path": "Quantity"
                                    },
                                    {
                                        "$Path": "QuantityPerParcel"
                                    }
                                ]
                            },
                            {
                                "$DivBy": [
                                    {
                                        "$Path": "Quantity"
                                    },
                                    {
                                        "$Path": "QuantityPerParcel"
                                    }
                                ]
                            },
                            {
                                "$Mod": [
                                    {
                                        "$Path": "Quantity"
                                    },
                                    {
                                        "$Path": "QuantityPerParcel"
                                    }
                                ]
                            }
                        ]
                    }
                }
            }

            assert.deepEqual(actual, expected);
    })

    it("apply", () => {
        const xml = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <edmx:DataServices>
        <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" 
                Namespace="ODataTest">
            <EntityType Name="Annotable">
                <Annotation Term="org.example.display.DisplayName">
                  <Apply Function="odata.concat">
                    <String>Product: </String>
                    <Path>ProductName</Path>
                    <Annotation Term="Core.Description" String="description text" />
                  </Apply>
                </Annotation>
            </EntityType>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;
        const actual = loadFromXml(xml);

        const expected: csdl.MetadataDocument = {
            $ApiRoot: "", $Version: "4.0",
            "ODataTest": {
                "Annotable": {
                    $Kind: csdl.CsdlKind.EntityType,
                    "@org.example.display.DisplayName": {
                        "$Apply": [
                            "Product: ",
                            {
                                "$Path": "ProductName"
                            }
                        ],
                        "$Function": "odata.concat",
                        "@Core.Description":"description text"
                    }
                }
            }
        }

        assert.deepEqual(actual, expected);
    })

    it("cast", () => {
        const xml = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <edmx:DataServices>
        <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" 
                Namespace="ODataTest">
            <EntityType Name="Annotable">
                 <Annotation Term="UI.Threshold">
                  <Cast Type="Edm.Decimal">
                    <Path>Average</Path>
                    <Annotation Term="Core.Description" String="description text" />
                  </Cast>
                </Annotation>
            </EntityType>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;
        const actual = loadFromXml(xml);

        const expected: csdl.MetadataDocument = {
            $ApiRoot: "", $Version: "4.0",
            "ODataTest": {
                "Annotable": {
                    $Kind: csdl.CsdlKind.EntityType,
                    "@UI.Threshold": {
                        "$Cast": {
                            "$Path": "Average"
                        },
                        "$Type": "Edm.Decimal",
                        "@Core.Description": "description text"
                    },
                }
            }
        }

        assert.deepEqual(actual, expected);
    })

    it("if", () => {
        const xml = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <edmx:DataServices>
        <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" 
                Namespace="ODataTest">
            <EntityType Name="Annotable">
                 <Annotation Term="org.example.person.Gender">
                  <If>
                    <Path>IsFemale</Path>
                    <String>Female</String>
                    <String>Male</String>
                    <Annotation Term="Core.Description" String="description text" />
                  </If>
                </Annotation>
            </EntityType>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;
        const actual = loadFromXml(xml);

        const expected: csdl.MetadataDocument = {
            $ApiRoot: "", $Version: "4.0",
            "ODataTest": {
                "Annotable": {
                    $Kind: csdl.CsdlKind.EntityType,
                    "@org.example.person.Gender": {
                        "$If": [
                            {
                                "$Path": "IsFemale"
                            },
                            "Female",
                            "Male"
                        ],
                        "@Core.Description": "description text"
                    },
                }
            }
        }

        assert.deepEqual(actual, expected);
    })

    it("IsOf", () => {
        const xml = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <edmx:DataServices>
        <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" 
                Namespace="ODataTest">
            <EntityType Name="Annotable">
                <Annotation Term="self.IsPreferredCustomer">
                  <IsOf Type="self.PreferredCustomer">
                    <Path>Customer</Path>
                    <Annotation Term="Core.Description" String="description text" />
                  </IsOf>
                </Annotation>
            </EntityType>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;
        const actual = loadFromXml(xml);

        const expected: csdl.MetadataDocument = {
            $ApiRoot: "", $Version: "4.0",
            "ODataTest": {
                "Annotable": {
                    $Kind: csdl.CsdlKind.EntityType,
                    "@self.IsPreferredCustomer": {
                        "$IsOf": {
                            "$Path": "Customer"
                        },
                        "$Type": "self.PreferredCustomer",
                        "@Core.Description": "description text"
                    },
                }
            }
        }

        assert.deepEqual(actual, expected);
    })

    it("Labeled element", () => {
        const xml = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <edmx:DataServices>
        <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" 
                Namespace="ODataTest">
            <EntityType Name="Annotable">
                <Annotation Term="org.example.display.DisplayName">
                  <LabeledElement Name="CustomerFirstName" Path="FirstName" >
                    <Annotation Term="Core.Description" String="description text" />
                  </LabeledElement>
                </Annotation>
            </EntityType>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;
        const actual = loadFromXml(xml);

        const expected: csdl.MetadataDocument = {
            $ApiRoot: "", $Version: "4.0",
            "ODataTest": {
                "Annotable": {
                    $Kind: csdl.CsdlKind.EntityType,
                    "@org.example.display.DisplayName": {
                        "$LabeledElement": {
                            "$Path": "FirstName"
                        },
                        "$Name": "CustomerFirstName",
                        "@Core.Description": "description text"
                    }
                }
            }
        }

        assert.deepEqual(actual, expected);
    })

    it("propery value", () => {
        const xml = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <edmx:DataServices>
        <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" 
                Namespace="ODataTest">
            <EntityType Name="Annotable">
                  <Annotation Term="Capabilities.UpdateRestrictions">
                  <Record>
                    <PropertyValue Property="NonUpdatableNavigationProperties">
                      <Collection>
                        <NavigationPropertyPath>Supplier</NavigationPropertyPath>
                        <NavigationPropertyPath>Category</NavigationPropertyPath>
                      </Collection>
                    </PropertyValue>
                    <Annotation Term="Core.Description" String="description text" />
                  </Record>
                </Annotation>
            </EntityType>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;
        const actual = loadFromXml(xml);

        const expected: csdl.MetadataDocument = {
            $ApiRoot: "", $Version: "4.0",
            "ODataTest": {
                "Annotable": {
                    $Kind: csdl.CsdlKind.EntityType,
                    "@Capabilities.UpdateRestrictions": {
                        "NonUpdatableNavigationProperties": [
                            {
                                "$NavigationPropertyPath": "Supplier"
                            },
                            {
                                "$NavigationPropertyPath": "Category"
                            }
                        ],
                        "@Core.Description":"description text"
                    },
                }
            }
        }

        assert.deepEqual(actual, expected);
    })

    it("constant expressions", () => {
        const xml = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <edmx:DataServices>
        <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" 
                Namespace="ODataTest">
            <EntityType Name="AnnotableAttr">
                <Annotation Term="UI.Thumbnail" Binary="T0RhdGE" />
                <Annotation Term="UI.ReadOnly" Bool="true" />
                <Annotation Term="vCard.birthDay" Date="2000-01-01" />
                <Annotation Term="UI.LastUpdated" DateTimeOffset="2000-01-01T16:00:00.000Z" />
                <Annotation Term="UI.Width" Decimal="3.14" />
                <Annotation Term="task.duration" Duration="P7D" />
                <Annotation Term="self.HasPattern" EnumMember="org.example.Pattern/Red org.example.Pattern/Striped" />
                <Annotation Term="UI.FloatWidth" Float="3.14" />
                <Annotation Term="UI.Id" Guid="21EC2020-3AEA-1069-A2DD-08002B30309D" />
                <Annotation Term="UI.Int" Int="42" />
                <Annotation Term="UI.DisplayName" String="Product Catalog" />
                <Annotation Term="UI.EndTime" TimeOfDay="21:45:00" />

            </EntityType>
            <EntityType Name="AnnotableElem">
                <Annotation Term="UI.Thumbnail">
                  <Binary>T0RhdGE</Binary>
                </Annotation>
                <Annotation Term="UI.ReadOnly">
                  <Bool>true</Bool>
                </Annotation>
                <Annotation Term="vCard.birthDay">
                  <Date>2000-01-01</Date>
                </Annotation>
                <Annotation Term="UI.LastUpdated">
                  <DateTimeOffset>2000-01-01T16:00:00.000-09:00</DateTimeOffset>
                </Annotation>
                <Annotation Term="UI.Width">
                  <Decimal>3.14</Decimal>
                </Annotation>
                <Annotation Term="task.duration">
                  <Duration>P11DT23H59M59.999999999999S</Duration>
                </Annotation>
                <Annotation Term="self.HasPattern">
                  <EnumMember>org.example.Pattern/Red org.example.Pattern/Striped</EnumMember>
                </Annotation>
                <Annotation Term="UI.FloatWidth">
                  <Float>INF</Float>
                </Annotation>
                <Annotation Term="UI.Id">
                  <Guid>21EC2020-3AEA-1069-A2DD-08002B30309D</Guid>
                </Annotation>
                <Annotation Term="UI.Int">
                  <Int>42</Int>
                </Annotation>
                <Annotation Term="UI.DisplayName">
                  <String>Product Catalog</String>
                </Annotation>
                <Annotation Term="UI.EndTime">
                  <TimeOfDay>21:45:00</TimeOfDay>
                </Annotation>
            </EntityType>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

        const actual = loadFromXml(xml);

        const expected: csdl.MetadataDocument = {
            $ApiRoot: "", $Version: "4.0",
            "ODataTest": {
                "AnnotableAttr": {
                    $Kind: csdl.CsdlKind.EntityType,
                    "@UI.Thumbnail": {
                        "$Binary": "T0RhdGE"
                    },
                    "@UI.ReadOnly": true,
                    "@vCard.birthDay": {
                        "$Date": "2000-01-01"
                    },
                    "@UI.LastUpdated": {
                        "$DateTimeOffset": "2000-01-01T16:00:00.000Z"
                    },
                    "@UI.Width": {
                        "$Decimal": "3.14"
                    },
                    "@task.duration": {
                        "$Duration": "P7D"
                    },
                    "@self.HasPattern": {
                        "$EnumMember": "Red,Striped"
                    },
                    "@UI.FloatWidth": 3.14,
                    "@UI.Id": {
                        "$Guid": "21EC2020-3AEA-1069-A2DD-08002B30309D"
                    },
                    "@UI.Int": {
                        "$Int": 42
                    },
                    "@UI.DisplayName": "Product Catalog",
                    "@UI.EndTime": {
                        "$TimeOfDay": "21:45:00"
                    }
                },

                "AnnotableElem": {
                    $Kind: csdl.CsdlKind.EntityType,
                    "@UI.Thumbnail": {
                        "$Binary": "T0RhdGE"
                    },
                    "@UI.ReadOnly": true,
                    "@vCard.birthDay": {
                        "$Date": "2000-01-01"
                    },
                    "@UI.LastUpdated": {
                        "$DateTimeOffset": "2000-01-02T01:00:00.000Z"
                    },
                    "@UI.Width": {
                        "$Decimal": "3.14"
                    },
                    "@task.duration": {
                        "$Duration": "P11DT23H59M59.999999999999S"
                    },
                    "@self.HasPattern": {
                        "$EnumMember": "Red,Striped"
                    },
                    "@UI.FloatWidth": {
                        "$Float": "INF"
                    },
                    "@UI.Id": {
                        "$Guid": "21EC2020-3AEA-1069-A2DD-08002B30309D"
                    },
                    "@UI.Int": {
                        "$Int": 42
                    },
                    "@UI.DisplayName": "Product Catalog",
                    "@UI.EndTime": {
                        "$TimeOfDay": "21:45:00"
                    }
                }
            } as csdl.Namespace
        };

        assert.deepEqual(actual, expected);

    })
});