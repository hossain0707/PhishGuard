import test from "node:test";
import assert from "node:assert/strict";
import { createAuth, credentials, publicUser } from "../shared/auth.js";
const config={SUPABASE_URL:"https://mock.supabase.co",SUPABASE_PUBLISHABLE_KEY:"test-publishable"};
function token(id,exp){return `${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify({sub:id,exp,aud:"authenticated",role:"authenticated"})).toString('base64url')}.signature`;}
test("credential validation and public user never expose session tokens",()=>{
  assert.throws(()=>credentials({email:"invalid",password:"x"}));
  assert.throws(()=>credentials({email:"a@b.test",password:"x".repeat(129)}));
  assert.deepEqual(publicUser({id:"a",email:"a@b.test",access_token:"secret",user_metadata:{full_name:"Alice"}}),{id:"a",email:"a@b.test",name:"Alice",createdAt:undefined});
});
test("SDK refreshes an expired session through the storage adapter",async()=>{
  const original=globalThis.fetch;const id="11111111-1111-4111-8111-111111111111";let refreshes=0;
  const now=Math.floor(Date.now()/1000),user={id,email:"a@example.test",user_metadata:{full_name:"Alice"}};
  const values=new Map([["phishguard_auth_v2",JSON.stringify({access_token:token(id,now-100),refresh_token:"old-refresh",expires_at:now-100,expires_in:3600,token_type:"bearer",user})]]);
  const storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  globalThis.fetch=async(url,options)=>{assert.ok(String(url).includes("grant_type=refresh_token"));assert.equal(JSON.parse(options.body).refresh_token,"old-refresh");refreshes++;return new Response(JSON.stringify({access_token:token(id,now+3600),refresh_token:"new-refresh",expires_in:3600,token_type:"bearer",user}),{status:200,headers:{"Content-Type":"application/json"}});};
  const client=createAuth(config,storage,true);
  try{const {data,error}=await client.auth.getSession();assert.equal(error,null);assert.equal(data.session.refresh_token,"new-refresh");assert.equal(refreshes,1);assert.ok(values.get("phishguard_auth_v2").includes("new-refresh"));}
  finally{client.auth.stopAutoRefresh();globalThis.fetch=original;}
});
test("invalid refresh clears credentials and requires a new login",async()=>{
  const original=globalThis.fetch;const now=Math.floor(Date.now()/1000);const id="11111111-1111-4111-8111-111111111111";
  const values=new Map([["phishguard_auth_v2",JSON.stringify({access_token:token(id,now-100),refresh_token:"revoked",expires_at:now-100,expires_in:3600,token_type:"bearer",user:{id}})]]);
  globalThis.fetch=async()=>new Response(JSON.stringify({code:"refresh_token_not_found",msg:"Refresh token not found"}),{status:400,headers:{"Content-Type":"application/json"}});
  const client=createAuth(config,{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)},true);
  try{const {data}=await client.auth.getSession();assert.equal(data.session,null);assert.equal(values.has("phishguard_auth_v2"),false);}
  finally{client.auth.stopAutoRefresh();globalThis.fetch=original;}
});
