// Pre-requisite: .env file (see .env-example)
// Example usage: node index.js decrypt <encPass> <iv>

require("dotenv").config();
const { createDecipheriv } = require("crypto");
const { Command } = require("commander");

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const KEY = process.env.KEY || "";

const program = new Command();

const decryptPassword = (encryptedPassword, iv, key) => {
  const secretKey = Buffer.from(key, "hex");
  const decipher = createDecipheriv(
    ENCRYPTION_ALGORITHM,
    secretKey,
    Buffer.from(iv, "hex")
  );
  let decrypted = decipher.update(encryptedPassword, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};

program
  .name("privatisation-decrypter")
  .description("CLI to decrypt privatised repo")
  .version("0.0.1");

program
  .command("decrypt")
  .description("Decrypt an encrypted password to plaintext")
  .argument("<encPass>", "encrypted string")
  .argument("<iv>", "iv")
  .action((encPass, iv) => {
    console.log(decryptPassword(encPass, iv, KEY));
  });

program.parse();
