# Exporte le cerveau Z-Anatomy regroupé par aires fonctionnelles (un .npz par groupe)
import bpy, bmesh, numpy as np, os, re
S='/tmp/claude-0/-home-claude/4e4e9a72-3ead-5197-81cd-815cb2bc9ef3/scratchpad/'
bpy.ops.wm.open_mainfile(filepath=S+'za/Z-Anatomy/Startup.blend')
O=bpy.data.objects
def rec(n): r=O[n]; return [r]+list(r.children_recursive)
RULES=[
 ('moteur', r'^(Precentral gyrus|Paracentral gyrus)'),
 ('sensitif', r'^Postcentral gyrus'),
 ('broca', r'^(Opercular part of inferior frontal gyrus|Triangular part of inferior frontal gyrus)'),
 ('prefrontal', r'^(Superior frontal gyrus|Middle frontal gyrus|Transverse frontopolar|Orbital gyri|Straight gyrus|Orbital part of)'),
 ('parietal', r'^(Superior parietal lobule|Precuneus|Supramarginal gyrus|Angular gyrus)'),
 ('audition', r'^(Transverse temporal gyri|Temporal plane|Superior temporal gyrus)'),
 ('temporal', r'^(Middle temporal gyrus|Inferior temporal gyrus|Lateral occipitotemporal gyrus|Temporal pole)'),
 ('hippocampe', r'^(Hippocampus|Medial occipitotemporal gyrus)'),
 ('limbique', r'^Cingulate gyrus'),
 ('insula', r'^Insula'),
 ('vision', r'^(Cuneus|Inferior occipital gyrus|Lateral occipital gyrus|Lingual gyrus|Occipital pole|Superior occipital gyri|Calcarine)'),
]
G={k:[] for k,_ in RULES}; G['sillons']=[]
for lobe in ['Frontal lobe.g','Parietal lobe.g','Occipital lobe.g','Temporal lobe.g','Limbic lobe.g','Insula.g']:
    for o in rec(lobe):
        if o.type!='MESH' or o.name.endswith(('.j','.t','.g')): continue
        for k,pat in RULES:
            if re.search(pat,o.name): G[k].append(o); break
        else: G['sillons'].append(o)
G['amygdale']=[o for o in rec('Basal forebrain.g') if o.name.startswith('Amygdaloid')]
G['striatum']=[o for o in rec('Corpus striatum.g') if o.type=='MESH']
G['thalamus']=[o for o in rec('Diencephalon.g') if o.type=='MESH' and re.match(r'(Thalamus|Lateral geniculate|Medial geniculate|Habenula)',o.name)]
G['hypothalamus']=[o for o in rec('Diencephalon.g') if o.type=='MESH' and re.match(r'(Hypothalamus|Mamillary)',o.name)]
G['optique']=[o for o in rec('Diencephalon.g') if o.type=='MESH' and re.match(r'(Optic chiasm|Optic tract)',o.name)]
G['tronc']=[o for o in rec('Brainstem.g') if o.type=='MESH' and not re.match(r'(Fourth ventricle|Aqueduct)',o.name)]
G['cervelet']=[o for o in rec('Cerebellum.g') if o.type=='MESH']
G['ventricules']=[o for o in bpy.data.objects if o.type=='MESH' and re.match(r'(Lateral ventricle|Third ventricle|Fourth ventricle|Aqueduct of midbrain)',o.name)]
dg=bpy.context.evaluated_depsgraph_get(); os.makedirs(S+'parts_brain',exist_ok=True); sc=bpy.context.scene
BUD={'cervelet':14000,'tronc':8000,'sillons':16000,'striatum':5000,'ventricules':4000}
for key,objs in G.items():
    bm=bmesh.new(); used=0
    for o in objs:
        if o.type!='MESH' or o.name.endswith(('.j','.t','.g')): continue
        eo=o.evaluated_get(dg); me=eo.to_mesh()
        if me is None or len(me.polygons)==0: eo.to_mesh_clear(); continue
        me.transform(o.matrix_world); bm.from_mesh(me); eo.to_mesh_clear(); used+=1
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5); bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bmesh.ops.triangulate(bm, faces=bm.faces[:])
    tris=len(bm.faces); me=bpy.data.meshes.new(key); bm.to_mesh(me); bm.free()
    ob=bpy.data.objects.new(key, me); sc.collection.objects.link(ob); budget=BUD.get(key,9000)
    if tris>budget: d=ob.modifiers.new('dec','DECIMATE'); d.ratio=budget/tris
    dg2=bpy.context.evaluated_depsgraph_get(); dg2.update(); em=ob.evaluated_get(dg2).to_mesh(); em.calc_loop_triangles()
    nv=len(em.vertices); nt=len(em.loop_triangles)
    P=np.zeros(nv*3,np.float32); em.vertices.foreach_get('co',P); N=np.zeros(nv*3,np.float32); em.vertex_normals.foreach_get('vector',N); I=np.zeros(nt*3,np.int32); em.loop_triangles.foreach_get('vertices',I)
    np.savez(S+'parts_brain/'+key+'.npz',P=P,N=N,I=I); ob.evaluated_get(dg2).to_mesh_clear(); bpy.data.objects.remove(ob)
    print('DONE',key,used,tris,'->',nt,flush=True)
