const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {onDocumentWrittenWithAuthContext} = require("firebase-functions/v2/firestore");
const {setGlobalOptions} = require("firebase-functions/v2");

initializeApp();
setGlobalOptions({region:"europe-west2",maxInstances:10});

const db=getFirestore();

function label(data){
  if(!data) return "";
  return data.name || data.personName || data.staffName || data.course || data.item || data.type || data.title || "";
}

exports.auditOrganisationChanges = onDocumentWrittenWithAuthContext(
  "organisations/{orgId}/{collection}/{docId}",
  async event=>{
    const orgId=event.params.orgId;
    const collection=event.params.collection;
    const docId=event.params.docId;

    // Do not audit the audit collection itself.
    if(collection==="audit") return;

    const before=event.data?.before?.data() || null;
    const after=event.data?.after?.data() || null;
    if(!before && !after) return;

    const action=!before?"created":!after?"deleted":"updated";
    const auth=event.auth;
    const uid=auth?.uid || "system";
    const email=auth?.token?.email || "";
    const summary=action==="updated"
      ? Object.keys(after||{}).filter(k=>JSON.stringify(before?.[k])!==JSON.stringify(after?.[k])).slice(0,12).join(", ")
      : label(after||before);

    await db.collection(`organisations/${orgId}/audit`).add({
      at:new Date(),
      uid,
      userName:email || uid,
      action,
      collection,
      recordId:docId,
      recordLabel:label(after||before),
      summary,
      before:before ? safe(before) : null,
      after:after ? safe(after) : null
    });
  }
);

function safe(value){
  const out={};
  for(const [k,v] of Object.entries(value||{})){
    // Keep audit useful without duplicating potentially huge file/blob values.
    if(typeof v==="string" && v.length>300) out[k]=v.slice(0,300)+"…";
    else if(k.toLowerCase().includes("password") || k.toLowerCase().includes("token")) continue;
    else out[k]=v;
  }
  return out;
}