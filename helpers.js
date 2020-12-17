const fs = require("fs")
const mongodb = require("mongodb")
const { ClientEncryption } = require("mongodb-client-encryption")
const { MongoClient, Binary } = mongodb

module.exports = {
  readMasterKey: function (path = "./master-key.txt") {
    return fs.readFileSync(path)
  },
  CsfleHelper: class {
    constructor({
      kmsProviders = null,
      keyAltNames = "demo-data-key",
      keyDB = "encryption",
      keyColl = "__keyVault",
      schema = null,
      connectionString = "mongodb://localhost:27017",
      mongocryptdBypassSpawn = false,
      mongocryptdSpawnPath = "mongocryptd"
    } = {}) {
      if (kmsProviders === null) {
        throw new Error("kmsProviders is required")
      }
      this.kmsProviders = kmsProviders
      this.keyAltNames = keyAltNames
      this.keyDB = keyDB
      this.keyColl = keyColl
      this.keyVaultNamespace = `${keyDB}.${keyColl}`
      this.schema = schema
      this.connectionString = connectionString
      this.mongocryptdBypassSpawn = mongocryptdBypassSpawn
      this.mongocryptdSpawnPath = mongocryptdSpawnPath
      this.regularClient = null
      this.csfleClient = null
    }

    /**
     * Creates a unique, partial index in the key vault collection
     * on the ``keyAltNames`` field.
     *
     * @param {MongoClient} client
     */
    async ensureUniqueIndexOnKeyVault(client) {
      try {
        await client
          .db(this.keyDB)
          .collection(this.keyColl)
          .createIndex("keyAltNames", {
            unique: true,
            partialFilterExpression: {
              keyAltNames: {
                $exists: true
              }
            }
          })
      } catch (e) {
        console.error(e)
        process.exit(1)
      }
    }

    /**
     * In the guide, https://docs.mongodb.com/ecosystem/use-cases/client-side-field-level-encryption-guide/,
     * we create the data key and then show that it is created by
     * retreiving it using a findOne query. Here, in implementation, we only
     * create the key if it doesn't already exist, ensuring we only have one
     * local data key.
     *
     * @param {MongoClient} client
     */
    async findOrCreateDataKey(client) {
      const encryption = new ClientEncryption(client, {
        keyVaultNamespace: this.keyVaultNamespace,
        kmsProviders: this.kmsProviders
      })

      await this.ensureUniqueIndexOnKeyVault(client)

      let dataKey = await client
        .db(this.keyDB)
        .collection(this.keyColl)
        .findOne({ keyAltNames: { $in: [this.keyAltNames] } })

      if (dataKey === null) {
        dataKey = await encryption.createDataKey("local", {
          keyAltNames: [this.keyAltNames]
        })
        return dataKey.toString("base64")
      }

      return dataKey["_id"].toString("base64")
    }

    async getRegularClient() {
      const client = new MongoClient(this.connectionString, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      })
      return await client.connect()
    }

    async getCsfleEnabledClient(schemaMap = null) {
      if (schemaMap === null) {
        throw new Error(
          "schemaMap is a required argument. Build it using the CsfleHelper.createJsonSchemaMap method"
        )
      }
      const client = new MongoClient(this.connectionString, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        monitorCommands: true,
        autoEncryption: {
          // The key vault collection contains the data key that the client uses to encrypt and decrypt fields.
          keyVaultNamespace: this.keyVaultNamespace,
          // The client expects a key management system to store and provide the application's master encryption key.
          // For now, we will use a local master key, so they use the local KMS provider.
          kmsProviders: this.kmsProviders,
          // The JSON Schema that we have defined doesn't explicitly specify the collection to which it applies.
          // To assign the schema, they map it to the medicalRecords.patients collection namespace
          schemaMap
        }
      })
      return await client.connect()
    }

    createJsonSchemaMap(dataKey = null) {
      if (dataKey === null) {
        throw new Error(
          "dataKey is a required argument. Ensure you've defined it in clients.js"
        )
      }
      return {
        "medicalRecords.patients": {
          bsonType: "object",
          // specify the encryptMetadata key at the root level of the JSON Schema.
          // As a result, all encrypted fields defined in the properties field of the
          // schema will inherit this encryption key unless specifically overwritten.
          encryptMetadata: {
            keyId: [new Binary(Buffer.from(dataKey, "base64"), 4)]
          },
          properties: {
            insurance: {
              bsonType: "object",
              properties: {
                // The insurance.policyNumber field is embedded inside the insurance
                // field and represents the patient's policy number.
                // This policy number is a distinct and sensitive field. 
                policyNumber: {
                  encrypt: {
                    bsonType: "int",
                    algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic"
                  }
                }
              }
            },
            // The medicalRecords field is an array that contains a set of medical record documents. 
            // Each medical record document represents a separate visit and specifies information
            // about the patient at that that time, such as their blood pressure, weight, and heart rate.
            // This field is sensitive and should be encrypted.
            medicalRecords: {
              encrypt: {
                bsonType: "array",
                algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random"
              }
            },
            // The bloodType field represents the patient's blood type.
            // This field is sensitive and should be encrypted. 
            bloodType: {
              encrypt: {
                bsonType: "string",
                algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random"
              }
            },
            // The ssn field represents the patient's 
            // social security number. This field is 
            // sensitive and should be encrypted.
            ssn: {
              encrypt: {
                bsonType: "int",
                algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic"
              }
            }
          }
        }
      }
    }
  }
}
