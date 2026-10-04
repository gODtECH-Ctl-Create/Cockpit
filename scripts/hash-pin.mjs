import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync=promisify(scrypt);
const pin=process.argv[2];

if(!/^\d{6}$/.test(pin??"")){
  console.error("Usage: node scripts/hash-pin.mjs 123456");
  process.exit(1);
}

const salt=randomBytes(16).toString("hex");
const N=16384,r=8,p=1,keylen=32;
const derived=await scryptAsync(pin,salt,keylen,{N,r,p,maxmem:32*1024*1024});
console.log("scrypt$"+N+"$"+r+"$"+p+"$"+salt+"$"+Buffer.from(derived).toString("hex"));
