# MonogDB Client Side Field Level Encryption (CSFLE) Node.js Demo

This guide shows you how to implement automatic Client-Side Field Level Encryption (CSFLE) using supported MongoDB drivers and is intended for full-stack developers. The guide presents the following information in the context of a real-world scenario.

Once you complete the steps in this guide, you should have:

  * an understanding of how client-side field level encryption works and in what situations it is practical
  * a working client application that demonstrates automatic CSFLE
  * resources on how to move the sample client application to production

## Running Locally

### Requirements

* MongoDB Atlas 4.2+
* MongoDB Node driver 3.6.2+
* The libmongocrypt library installed
* The mongocryptd binary installed

1. Clone this repository and navigate to the **nodejs** directory.

   ```sh
   git clone https://github.com/mongodb-university/csfle-guides.git
   cd nodejs
   ```

   Work from the **nodejs** directory for the remainder of these instructions.

2. Start a locally running `mongod` instance (Enterprise version >= 4.2) running on port 27017

3. Install the dependencies in `package.json`

   ```js
   npm install
   ```

4. Make sure you have the `master-key.txt` file in the root of your execution
   environment. This is a 96-byte cryptographically-secure generated master
   encryption key required to run this example project. To generate your own
   master key or use a KMS, refer to the [CSFLE Use Case Guide](https://docs.mongodb.com/ecosystem/use-cases/client-side-field-level-encryption-guide/).

5. Run the `make-data-key.js` script to make a data key. If there is an
   existing data key in the **encryption.\_\_keyVault** collection this script
   will not create a duplicate data key.

   ```js
   node make-data-key.js
   ```

   This outputs a base64 encoded string of the UUID of your newly created data key. Paste
   this into `clients.js` where you see this line

   ```js
   let dataKey = null // change this!
   ```

6. Run the `clients.js` script to insert a document with the CSFLE-enabled client
   and then read that document with it as well as a regular client. You
   will see that the CSFLE-enabled client prints the document out in plaintext,
   and the regular client prints the document out with encrypted fields in
   binary format. This is safe to run multiple times as the insert operation
   used is an update with `upsert` specified.

   ```js
   node clients.js
   ```

7. Suggestion: Try inserting a document with the regular client. What happens?

## Running CSFLE with Docker

1. Change directories to the docker directory.
  ```sh
  cd docker
  ```

2. Build Docker image with a tag name. Within this directory execute: 
   * For using the latest driver version:
     ```sh
     docker build . -t mdb-csfle-example
     ```
   This will build a Docker image with a tag name `mdb-csfle-example`. 

3. Run the Docker image by executing:
   ```sh
   docker run -tih csfle mdb-csfle-example
   ```
   The command above will run a Docker image with tag `mdb-csfle-example` and provide it with `csfle` as its hostname.

4. Once you're inside the Docker container, you could follow below steps to run the NodeJS code example. 

  ```sh
  $ export MONGODB_URL="mongodb+srv://USER:PWD@EXAMPLE.mongodb.net/dbname?retryWrites=true&w=majority"`
  $ node ./example.js
  ```

  If you're connecting to MongoDB Atlas please make sure to [Configure Whitelist Entries](https://docs.atlas.mongodb.com/security-whitelist/)

## Contributing

Please read [CONTRIBUTING.md](https://github.com/JoeKarlsson/iot-kitty-litter-box/blob/develop/CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

### Contributing TLDR;

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

### Maintainers

<table>
  <tbody>
    <tr>
      <td align="center">
        <img width="150 height="150"
        src="https://avatars.githubusercontent.com/JoeKarlsson?v=3">
        <br />
        <a href="https://github.com/JoeKarlsson">Joe Karlsson</a>
      </td>
    <tr>
  <tbody>
</table>

### License

#### [Apache 2.0](./LICENSE)