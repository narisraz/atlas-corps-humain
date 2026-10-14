import numpy as np, json, struct, sys, os
src=sys.argv[1]; out=sys.argv[2]
order=sys.argv[3].split(',') if len(sys.argv)>3 else ['peau','squelette','crane','cerveau','moelle','coeur','arteres','veines','poumons','diaphragme','estomac','foie','intestin','colon','reins','vessie']
bin_=bytearray(); views=[]; accs=[]; meshes=[]; nodes=[]
def add_view(b, target=None):
    while len(bin_)%4: bin_.append(0)
    off=len(bin_); bin_.extend(b); v={'buffer':0,'byteOffset':off,'byteLength':len(b)}
    if target: v['target']=target
    views.append(v); return len(views)-1
for k in order:
    f=os.path.join(src,k+'.npz')
    if not os.path.exists(f): print('skip',k); continue
    d=np.load(f); P=d['P'].reshape(-1,3); N=d['N'].reshape(-1,3); I=d['I']
    # Blender Z-up -> glTF Y-up
    P=np.stack([P[:,0],P[:,2],-P[:,1]],1).astype(np.float32)
    N=np.stack([N[:,0],N[:,2],-N[:,1]],1)
    Nq=np.zeros((len(N),4),np.int8); Nq[:,:3]=np.clip(np.round(N*127),-127,127)
    idx=I.astype(np.uint16 if len(P)<65536 else np.uint32)
    vp=add_view(P.tobytes(),34962); accs.append({'bufferView':vp,'componentType':5126,'count':len(P),'type':'VEC3','min':P.min(0).tolist(),'max':P.max(0).tolist()}); ap=len(accs)-1
    vn=add_view(Nq.tobytes(),34962); views[vn]['byteStride']=4; accs.append({'bufferView':vn,'componentType':5120,'normalized':True,'count':len(P),'type':'VEC3'}); an=len(accs)-1
    vi=add_view(idx.tobytes(),34963); accs.append({'bufferView':vi,'componentType':5123 if idx.dtype==np.uint16 else 5125,'count':len(idx),'type':'SCALAR'}); ai=len(accs)-1
    meshes.append({'name':k,'primitives':[{'attributes':{'POSITION':ap,'NORMAL':an},'indices':ai}]})
    nodes.append({'name':k,'mesh':len(meshes)-1})
    print(k,len(P),'v',len(idx)//3,'t')
while len(bin_)%4: bin_.append(0)
g={'asset':{'version':'2.0','generator':'atlas-vivant','copyright':'Z-Anatomy (CC BY-SA 4.0), d\'après BodyParts3D, DBCLS (CC BY-SA 2.1 JP)'},
   'extensionsUsed':['KHR_mesh_quantization'],'extensionsRequired':['KHR_mesh_quantization'],
   'scene':0,'scenes':[{'nodes':list(range(len(nodes)))}],'nodes':nodes,'meshes':meshes,'accessors':accs,'bufferViews':views,'buffers':[{'byteLength':len(bin_)}]}
j=json.dumps(g,separators=(',',':')).encode()
while len(j)%4: j+=b' '
with open(out,'wb') as fo:
    fo.write(struct.pack('<III',0x46546C67,2,12+8+len(j)+8+len(bin_)))
    fo.write(struct.pack('<II',len(j),0x4E4F534A)); fo.write(j)
    fo.write(struct.pack('<II',len(bin_),0x004E4942)); fo.write(bin_)
print('size',os.path.getsize(out))
