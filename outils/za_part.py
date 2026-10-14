import bpy, bmesh
bpy.ops.wm.open_mainfile(filepath='/tmp/claude-0/-home-claude/4e4e9a72-3ead-5197-81cd-815cb2bc9ef3/scratchpad/za/Z-Anatomy/Startup.blend')
O=bpy.data.objects
dg=bpy.context.evaluated_depsgraph_get()
def desc(name, excl=()):
    root=O[name]; ex=set()
    for e in excl:
        ex|={O[e]}|set(O[e].children_recursive)
    return [o for o in [root]+list(root.children_recursive) if o not in ex]
G={
 'peau':      (desc('Regions of human body.g',['Hairs.g']), 120000),
 'squelette': (desc('Skeletal system.g',['Auditory ossicles.g','Teeth.g','Cranium.g','Extracranial bones of head.g']), 75000),
 'crane':     (desc('Cranium.g')+desc('Extracranial bones of head.g'), 16000),
 'cerveau':   (desc('Brain.g'), 40000),
 'moelle':    (desc('Spinal cord.g')+desc('Peripheral nervous system.g'), 25000),
 'coeur':     (desc('Heart.g'), 30000),
 'arteres':   (desc('Arterial system.g',['Heart.g']), 40000),
 'veines':    (desc('Venous system.g'), 30000),
 'poumons':   (desc('Lungs.g')+desc('Tracheobronchial tree.g'), 22000),
 'diaphragme':([O['Diaphragm']], 6000),
 'estomac':   ([O['Stomach'],O['Oesophagus']], 10000),
 'foie':      (desc('Liver')+[O['Gallbladder']], 12000),
 'intestin':  (desc('Small intestine.g'), 25000),
 'colon':     (desc('Large intestine.g'), 18000),
 'reins':     ([O[n] for n in ['Kidney.l','Kidney.r','Renal pelvis.l','Renal pelvis.r','Ureter.l','Ureter.r']], 10000),
 'vessie':    ([O['Urinary bladder']], 3000),
}

import sys, numpy as np
key=sys.argv[sys.argv.index('--')+1]
objs,budget=G[key]
bm=bmesh.new(); used=0
for o in objs:
    if o.type not in ('MESH','CURVE'): continue
    if o.name.endswith('.j') or o.name.endswith('.t') or o.name.endswith('.g'): continue
    eo=o.evaluated_get(dg)
    try: me=eo.to_mesh()
    except Exception: continue
    if me is None or len(me.polygons)==0: eo.to_mesh_clear(); continue
    me.transform(o.matrix_world); bm.from_mesh(me); eo.to_mesh_clear(); used+=1
bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=2e-5)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
bmesh.ops.triangulate(bm, faces=bm.faces[:])
tris=len(bm.faces)
me=bpy.data.meshes.new(key); bm.to_mesh(me); bm.free()
sc=bpy.context.scene
ob=bpy.data.objects.new(key, me); sc.collection.objects.link(ob)
if tris>budget:
    d=ob.modifiers.new('dec','DECIMATE'); d.ratio=budget/tris
dg2=bpy.context.evaluated_depsgraph_get(); dg2.update()
em=ob.evaluated_get(dg2).to_mesh()
em.calc_loop_triangles()
nv=len(em.vertices); nt=len(em.loop_triangles)
P=np.zeros(nv*3,np.float32); em.vertices.foreach_get('co',P)
N=np.zeros(nv*3,np.float32); em.vertex_normals.foreach_get('vector',N)
I=np.zeros(nt*3,np.int32); em.loop_triangles.foreach_get('vertices',I)
np.savez('/tmp/claude-0/-home-claude/4e4e9a72-3ead-5197-81cd-815cb2bc9ef3/scratchpad/parts/'+key+'.npz',P=P,N=N,I=I)
print('DONE',key,used,tris,'->',nt,'tris',nv,'verts')
