Follow these steps to set up hyperledger fabric. Download and get docker and docker-compose up on your system. Then (most convenient way being this) in a linux or wsl environment,  get the fabric-samples downloaded on your system:

`curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh && chmod +x install-fabric.sh`

Ensure docker is running and if you're using wsl2, it has wsl integration on. Then navigate to the `\fabric-samples\test-network` in the newly downloaded fabric-samples file, and hit `./network.sh up`

Now the hyperledger fabric is up and running on your system. 

---

Next, Create a 'wallet' folder in 'server' directory. This will store the admin credentials that the system will use to verify transactions on behalf of users. There exists a enrollAdmin.js file in fabric directory in the codebase which is used to create the admin identity itself. Execute it in a terminal by running: `node enrollAdmin.js`

You have now created an admin.id file in the wallet directory.

---

As far as backend and frontend setup go, clone the repo and `npm install` in both client directory and server- it installs all dependencies.

Copy the .env.example into a .env file and fill with your information. Make sure mySQL is installed on your system before. Create a database with whatever name you specify in the .env file. 

Now you are done- start the server and client.
