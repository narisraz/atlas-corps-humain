import bpy, json, mathutils
bpy.ops.wm.open_mainfile(filepath='/tmp/claude-0/-home-claude/4e4e9a72-3ead-5197-81cd-815cb2bc9ef3/scratchpad/za/Z-Anatomy/Startup.blend')
O=bpy.data.objects
def curves(root):
    r=O[root]; return [o for o in [r]+list(r.children_recursive) if o.type=='CURVE']
out={}
for sysname, roots in [('art',['Arterial system.g']),('vei',['Venous system.g']),('ner',['Peripheral nervous system.g','Spinal cord.g']),('uri',['Ureter.l','Ureter.r'])]:
    L=[]
    for root in roots:
        for o in curves(root):
            mw=o.matrix_world
            for sp in o.data.splines:
                if sp.type=='BEZIER':
                    pts=[]
                    bp=sp.bezier_points
                    for i in range(len(bp)):
                        pts.append(bp[i].co)
                        if i+1<len(bp):
                            a,h1,h2,b=bp[i].co,bp[i].handle_right,bp[i+1].handle_left,bp[i+1].co
                            for t in (0.25,0.5,0.75):
                                u=1-t; pts.append(a*u*u*u+h1*3*u*u*t+h2*3*u*t*t+b*t*t*t)
                else:
                    pts=[mathutils.Vector(p.co[:3]) for p in sp.points]
                if len(pts)<2: continue
                w=[mw@mathutils.Vector(p[:3]) for p in pts]
                ln=sum((w[i+1]-w[i]).length for i in range(len(w)-1))
                if ln<0.02: continue
                L.append({'n':o.name,'l':round(ln,3),'p':[[round(-v.x,4),round(v.z,4),round(-v.y,4)] for v in w]})
    out[sysname]=L
    print(sysname,len(L),round(sum(c['l'] for c in L),2))
json.dump(out,open('/tmp/claude-0/-home-claude/4e4e9a72-3ead-5197-81cd-815cb2bc9ef3/scratchpad/trajets.json','w'),separators=(',',':'))
