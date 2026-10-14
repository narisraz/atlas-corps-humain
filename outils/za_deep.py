# Exporte les pièces fines du cœur et des poumons (un objet par pièce) + lignes médianes des vaisseaux / bronches
import bpy, bmesh, json, mathutils, numpy as np, os
S='/tmp/claude-0/-home-claude/4e4e9a72-3ead-5197-81cd-815cb2bc9ef3/scratchpad/'
bpy.ops.wm.open_mainfile(filepath=S+'za/Z-Anatomy/Startup.blend')
O=bpy.data.objects
def rec(n): r=O[n]; return [r]+list(r.children_recursive)
G={
 'og': ([O['Left atrium']],6000), 'vg': ([O['Left ventricle'],O['Inferior papillary muscle of left ventricle']],8000),
 'od': ([O['Right atrium']],6000), 'vd': ([O['Right ventricle']]+[O[n] for n in ['Anterior papillary muscle of right ventricle','Inferior papillary muscle of right ventricle','Septal papillary muscle of right ventricle']],8000),
 'tri_inf': ([O['Inferior leaflet of right atrioventricular valve']],2500), 'tri_sep': ([O['Septal leaflet of right atrioventricular valve']],2500),
 'mit_post': ([O['Posterior leaflet of left atrioventricular valve']],2500),
 'ao_lc': ([O['Left coronary leaflet']],900), 'ao_nc': ([O['Non-coronary leaflet']],900), 'ao_rc': ([O['Right coronary leaflet']],900),
 'pu_ant': ([O['Anterior semilunar leaflet of pulmonary valve']],1200), 'pu_l': ([O['Left semilunar leaflet of pulmonary valve']],1200), 'pu_r': ([O['Right semilunar leaflet of pulmonary valve']],1200),
 'aorte': ([O['Ascending aorta'],O['Aortic arch']],5000),
 'tronc_pulm': ([O['Pulmonary trunk'],O['Bifurcation of pulmonary trunk'],O['Right pulmonary artery'],O['Left pulmonary artery']],4000),
 'veines_caves': ([O['Superior vena cava'],O['Inferior vena cava (thoracic part)']],3000),
 'veines_pulm': ([O[n] for n in ['Left inferior pulmonary vein','Left superior pulmonary vein','Right inferior pulmonary vein','Right superior pulmonary vein']],3000),
 'coronaires': (rec('Arteries of heart.g'),6000), 'veines_card': (rec('Cardiac veins.g'),4000),
 'lobe_sd': ([O['Superior lobe of right lung']],3000), 'lobe_md': ([O['Middle lobe of right lung']],3000), 'lobe_id': ([O['Inferior lobe of right lung']],3000),
 'lobe_sg': ([O['Superior lobe of left lung']],3000), 'lobe_ig': ([O['Inferior lobe of left lung']],3000),
 'trachee': ([O['Trachea']],4000), 'bronches': (rec('Bronchi.g'),24000),
 'art_pulm': (rec('Pulmonary arteries.g'),16000), 'vei_pulm': (rec('Pulmonary veins.g'),12000),
}
dg=bpy.context.evaluated_depsgraph_get()
os.makedirs(S+'parts_deep',exist_ok=True)
sc=bpy.context.scene
for key,(objs,budget) in G.items():
    bm=bmesh.new(); used=0
    for o in objs:
        if o.type not in ('MESH','CURVE') or o.name.endswith(('.j','.t','.g')): continue
        eo=o.evaluated_get(dg)
        try: me=eo.to_mesh()
        except Exception: continue
        if me is None or len(me.polygons)==0: eo.to_mesh_clear(); continue
        me.transform(o.matrix_world); bm.from_mesh(me); eo.to_mesh_clear(); used+=1
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bmesh.ops.triangulate(bm, faces=bm.faces[:])
    tris=len(bm.faces); me=bpy.data.meshes.new(key); bm.to_mesh(me); bm.free()
    ob=bpy.data.objects.new(key, me); sc.collection.objects.link(ob)
    if tris>budget: d=ob.modifiers.new('dec','DECIMATE'); d.ratio=budget/tris
    dg2=bpy.context.evaluated_depsgraph_get(); dg2.update()
    em=ob.evaluated_get(dg2).to_mesh(); em.calc_loop_triangles()
    nv=len(em.vertices); nt=len(em.loop_triangles)
    P=np.zeros(nv*3,np.float32); em.vertices.foreach_get('co',P)
    N=np.zeros(nv*3,np.float32); em.vertex_normals.foreach_get('vector',N)
    I=np.zeros(nt*3,np.int32); em.loop_triangles.foreach_get('vertices',I)
    np.savez(S+'parts_deep/'+key+'.npz',P=P,N=N,I=I)
    ob.evaluated_get(dg2).to_mesh_clear(); bpy.data.objects.remove(ob)
    print('DONE',key,used,tris,'->',nt,flush=True)
# Lignes médianes
def pts_of(o):
    mw=o.matrix_world; R=[]
    for sp in o.data.splines:
        if sp.type=='BEZIER':
            bp=sp.bezier_points; pts=[]
            for i in range(len(bp)):
                pts.append(bp[i].co)
                if i+1<len(bp):
                    a,h1,h2,b=bp[i].co,bp[i].handle_right,bp[i+1].handle_left,bp[i+1].co
                    for t in (0.25,0.5,0.75):
                        u=1-t; pts.append(a*u*u*u+h1*3*u*u*t+h2*3*u*t*t+b*t*t*t)
        else: pts=[mathutils.Vector(p.co[:3]) for p in sp.points]
        w=[mw@mathutils.Vector(p[:3]) for p in pts]
        R.append([[round(-v.x,4),round(v.z,4),round(-v.y,4)] for v in w])
    return R
L={}
for o in rec('Bronchi.g')+rec('Pulmonary arteries.g')+rec('Pulmonary veins.g')+[O[n] for n in ['Ascending aorta','Aortic arch','Superior vena cava','Inferior vena cava (thoracic part)','Trachea']]:
    if o.type=='CURVE':
        L[o.name]={'parent':o.parent.name if o.parent else None,'p':pts_of(o)}
json.dump(L,open(S+'deep_lines.json','w'),separators=(',',':'))
print('lines',len(L))
