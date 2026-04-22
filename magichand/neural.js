// neural.js — 神经网络生成算法
// 通过 import { genNet } from './neural.js' 引入，必须作为 ES module 加载

import * as THREE from 'three';

console.log('[MagicHand] neural.js loaded');

// ====== Node 类 ======
class Nd {
  constructor(p, l = 0, t = 0) {
    this.p = p; this.c = []; this.l = l; this.t = t;
    this.s = t ? THREE.MathUtils.randFloat(.4, .9) : THREE.MathUtils.randFloat(.7, 1.2);
    this.d = 0;
  }
  add(n, s = 1) { if (!this.has(n)) { this.c.push({ n, s }); n.c.push({ n: this, s }); } }
  has(n) { return this.c.some(x => x.n === n); }
}

function R(v) { return THREE.MathUtils.randFloatSpread(v); }

function genNet(fi, df = 1) {
  let ns = [], root;

  function bridge(a, b, sg, st) {
    let pv = a;
    for (let j = 1; j <= sg; j++) {
      const t = j / (sg + 1);
      const pos = new THREE.Vector3().lerpVectors(a.p, b.p, t).add(new THREE.Vector3(R(3), R(3), R(3)));
      const nn = new Nd(pos, Math.max(a.l, b.l), 0);
      nn.d = root.p.distanceTo(pos); ns.push(nn); pv.add(nn, st); pv = nn;
    }
    pv.add(b, st);
  }

  if (fi % 4 === 0) { // 量子皮层
    root = new Nd(new THREE.Vector3(), 0, 0); root.s = 1.5; ns.push(root);
    const axN = 6, nPA = 8, aL = 20, ends = [];
    for (let a = 0; a < axN; a++) {
      const ph = Math.acos(-1 + 2 * a / axN), th = Math.PI * (1 + Math.sqrt(5)) * a;
      const dir = new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.sin(ph) * Math.sin(th), Math.cos(ph));
      let pv = root;
      for (let i = 1; i <= nPA; i++) {
        const t = i / nPA, ds = aL * Math.pow(t, .8), pos = dir.clone().multiplyScalar(ds);
        const nn = new Nd(pos, i, i === nPA ? 1 : 0); nn.d = ds; ns.push(nn);
        pv.add(nn, 1 - t * .3); pv = nn; if (i === nPA) ends.push(nn);
      }
    }
    const rD = [5, 10, 15], rNs = [];
    for (const rd of rD) {
      const n = Math.floor(rd * 3 * df), rl = [];
      for (let i = 0; i < n; i++) {
        const t = i / n, rp = Math.acos(2 * Math.random() - 1), rt = 2 * Math.PI * t;
        const pos = new THREE.Vector3(rd * Math.sin(rp) * Math.cos(rt), rd * Math.sin(rp) * Math.sin(rt), rd * Math.cos(rp));
        const nn = new Nd(pos, Math.ceil(rd / 5), Math.random() < .4 ? 1 : 0); nn.d = rd; ns.push(nn); rl.push(nn);
      }
      rNs.push(rl);
      for (let i = 0; i < rl.length; i++) rl[i].add(rl[(i + 1) % rl.length], .7);
    }
    for (const ring of rNs) for (const nd of ring) {
      let cl = null, md = 1e9;
      for (const n of ns) { if (n === root || n === nd || n.t) continue; const d2 = nd.p.distanceTo(n.p); if (d2 < md) { md = d2; cl = n; } }
      if (cl && md < 8) nd.add(cl, .5 + (1 - md / 8) * .5);
    }
    for (let r = 0; r < rNs.length - 1; r++) {
      const inn = rNs[r], out = rNs[r + 1];
      for (let i = 0; i < Math.floor(inn.length * .5); i++) {
        const a = inn[Math.floor(Math.random() * inn.length)], b = out[Math.floor(Math.random() * out.length)];
        if (!a.has(b)) a.add(b, .6);
      }
    }
    for (let i = 0; i < ends.length; i++) bridge(ends[i], ends[(i + 2) % ends.length], 3, .5);
  }

  else if (fi % 4 === 1) { // 超维度网格
    root = new Nd(new THREE.Vector3(), 0, 0); root.s = 1.5; ns.push(root);
    const dims = 4, nPD = Math.floor(40 * df), mx = 20;
    const dv = [new THREE.Vector3(1, 1, 1).normalize(), new THREE.Vector3(-1, 1, -1).normalize(), new THREE.Vector3(1, -1, -1).normalize(), new THREE.Vector3(-1, -1, 1).normalize()];
    const dNs = [];
    for (let d = 0; d < dims; d++) {
      const dn = [];
      for (let i = 0; i < nPD; i++) {
        const ds = mx * Math.pow(Math.random(), .7), rv = new THREE.Vector3(R(1), R(1), R(1)).normalize();
        const bv = new THREE.Vector3().addVectors(dv[d].clone().multiplyScalar(.6 + Math.random() * .4), rv.clone().multiplyScalar(.3)).normalize();
        const pos = bv.clone().multiplyScalar(ds), lf = Math.random() < .4 || ds > mx * .8;
        const nn = new Nd(pos, Math.floor(ds / (mx / 4)) + 1, lf ? 1 : 0); nn.d = ds; ns.push(nn); dn.push(nn);
        if (ds < mx * .3) root.add(nn, .7);
      }
      dNs.push(dn);
    }
    for (let d = 0; d < dims; d++) {
      const dn = dNs[d].sort((a, b) => a.d - b.d), ly = 4, npl = Math.ceil(dn.length / ly);
      for (let l = 0; l < ly; l++) {
        const si = l * npl, ei = Math.min(si + npl, dn.length);
        for (let i = si; i < ei; i++) {
          const nd = dn[i], cc = 1 + Math.floor(Math.random() * 3);
          const nb = dn.slice(si, ei).filter(x => x !== nd).sort((a, b) => nd.p.distanceTo(a.p) - nd.p.distanceTo(b.p));
          for (let j = 0; j < Math.min(cc, nb.length); j++) if (!nd.has(nb[j])) nd.add(nb[j], .4 + Math.random() * .4);
          if (l > 0) {
            const pl = dn.slice(Math.max(0, (l - 1) * npl), l * npl).sort((a, b) => nd.p.distanceTo(a.p) - nd.p.distanceTo(b.p));
            if (pl.length && !nd.has(pl[0])) nd.add(pl[0], .8);
          }
        }
      }
    }
    for (let d1 = 0; d1 < dims; d1++) for (let d2 = d1 + 1; d2 < dims; d2++) {
      for (let i = 0; i < Math.floor(5 * df); i++) {
        const n1 = dNs[d1][Math.floor(Math.random() * dNs[d1].length)], n2 = dNs[d2][Math.floor(Math.random() * dNs[d2].length)];
        if (!n1.has(n2)) {
          const mp = new THREE.Vector3().lerpVectors(n1.p, n2.p, .5).add(new THREE.Vector3(R(2), R(2), R(2)));
          const nn = new Nd(mp, Math.max(n1.l, n2.l), 0); nn.d = root.p.distanceTo(mp); ns.push(nn); n1.add(nn, .5); nn.add(n2, .5);
        }
      }
    }
    for (let i = 0; i < Math.floor(10 * df); i++) {
      const sd = Math.floor(Math.random() * dims), ed = (sd + 2) % dims;
      const sn = dNs[sd][Math.floor(Math.random() * dNs[sd].length)], en = dNs[ed][Math.floor(Math.random() * dNs[ed].length)];
      if (!sn.has(en)) { let pv = sn; for (let j = 1; j < 3 + Math.floor(Math.random() * 3); j++) {
        const t = j / 4, pos = new THREE.Vector3().lerpVectors(sn.p, en.p, t).add(new THREE.Vector3(R(8) * Math.sin(t * Math.PI), R(8) * Math.sin(t * Math.PI), R(8) * Math.sin(t * Math.PI)));
        const nn = new Nd(pos, Math.max(sn.l, en.l), 0); nn.d = root.p.distanceTo(pos); ns.push(nn); pv.add(nn, .4); pv = nn;
      } pv.add(en, .4); }
    }
  }

  else if (fi % 4 === 2) { // 神经漩涡
    root = new Nd(new THREE.Vector3(), 0, 0); root.s = 1.8; ns.push(root);
    const nSp = 6, tH = 30, mxR = 16, nPS = Math.floor(30 * df), spNs = [];
    for (let s = 0; s < nSp; s++) {
      const sp = (s / nSp) * Math.PI * 2, sa = [];
      for (let i = 0; i < nPS; i++) {
        const t = i / (nPS - 1), h = (t - .5) * tH, r = mxR * Math.sin(t * Math.PI), a = sp + t * Math.PI * 2 * 2.5;
        const pos = new THREE.Vector3(r * Math.cos(a), h, r * Math.sin(a)).add(new THREE.Vector3(R(1.5), R(1.5), R(1.5)));
        const nn = new Nd(pos, Math.floor(t * 5) + 1, Math.random() < .3 || i > nPS - 3 ? 1 : 0);
        nn.d = Math.sqrt(r * r + h * h); ns.push(nn); sa.push(nn);
      }
      spNs.push(sa);
    }
    for (const sp of spNs) { root.add(sp[0], 1); for (let i = 0; i < sp.length - 1; i++) sp[i].add(sp[i + 1], .9); }
    for (let s = 0; s < nSp; s++) { const c = spNs[s], n = spNs[(s + 1) % nSp];
      for (let i = 0; i < 5; i++) { const t = i / 4; c[Math.floor(t * (c.length - 1))].add(n[Math.floor(t * (n.length - 1))], .7); } }
    for (let s = 0; s < nSp; s++) { const c = spNs[s], j = spNs[(s + 2) % nSp];
      for (let i = 0; i < 3; i++) {
        const cN = c[Math.floor(((i + .5) / 3) * (c.length - 1))], eN = j[Math.floor(((i + 1) / 3) * (j.length - 1))];
        const mp = new THREE.Vector3().lerpVectors(cN.p, eN.p, .5).multiplyScalar(.7);
        const bn = new Nd(mp, Math.max(cN.l, eN.l), 0); bn.d = root.p.distanceTo(mp); ns.push(bn); cN.add(bn, .6); bn.add(eN, .6);
      }
    }
    for (let r = 0; r < 5; r++) {
      const h = (r / 4 - .5) * tH * .7;
      const rn = ns.filter(n => n !== root && Math.abs(n.p.y - h) < 2).sort((a, b) => Math.atan2(a.p.z, a.p.x) - Math.atan2(b.p.z, b.p.x));
      if (rn.length > 3) for (let i = 0; i < rn.length; i++) rn[i].add(rn[(i + 1) % rn.length], .5);
    }
    for (let i = 0; i < Math.floor(10 * df); i++) {
      const nd = ns.filter(n => n !== root && n.p.length() > 5).sort(() => Math.random() - .5)[0];
      if (nd) { let pv = nd; const sg = 1 + Math.floor(Math.random() * 2);
        for (let j = 1; j <= sg; j++) {
          const t = j / (sg + 1), sp = nd.p.clone().multiplyScalar(1 - t).add(new THREE.Vector3(R(2), R(2), R(2)));
          const nn = new Nd(sp, Math.floor(nd.l * (1 - t)), 0); nn.d = root.p.distanceTo(sp); ns.push(nn); pv.add(nn, .7); pv = nn;
        } pv.add(root, .8); }
    }
  }

  else { // 突触云
    root = new Nd(new THREE.Vector3(), 0, 0); root.s = 1.5; ns.push(root);
    const nCl = 6, mxD = 18, clNs = [];
    for (let c = 0; c < nCl; c++) {
      const ph = Math.acos(2 * Math.random() - 1), th = 2 * Math.PI * Math.random(), ds = mxD * (.3 + .7 * Math.random());
      const pos = new THREE.Vector3(ds * Math.sin(ph) * Math.cos(th), ds * Math.sin(ph) * Math.sin(th), ds * Math.cos(ph));
      const cn = new Nd(pos, 1, 0); cn.s = 1.2; cn.d = ds; ns.push(cn); clNs.push(cn); root.add(cn, .9);
    }
    for (let i = 0; i < clNs.length; i++) for (let j = i + 1; j < clNs.length; j++) {
      const d = clNs[i].p.distanceTo(clNs[j].p), pr = 1 - d / (mxD * 2);
      if (Math.random() < pr) clNs[i].add(clNs[j], .5 + .5 * (1 - d / (mxD * 2)));
    }
    for (const cl of clNs) {
      const cs = Math.floor(20 * df), cr = 7 + Math.random() * 3;
      for (let i = 0; i < cs; i++) {
        const rad = cr * Math.pow(Math.random(), .5), dir = new THREE.Vector3(R(2), R(2), R(2)).normalize();
        const pos = new THREE.Vector3().copy(cl.p).add(dir.multiplyScalar(rad));
        const nn = new Nd(pos, 2 + Math.floor(rad / 3), Math.random() < .5 ? 1 : 0);
        nn.d = root.p.distanceTo(pos); nn._cl = cl; ns.push(nn); cl.add(nn, .7 * (1 - rad / cr));
        const nb = ns.filter(n => n !== nn && n !== cl && n._cl === cl && n.p.distanceTo(pos) < cr * .4)
          .sort((a, b) => pos.distanceTo(a.p) - pos.distanceTo(b.p));
        for (let j = 0; j < Math.min(Math.floor(Math.random() * 3), nb.length); j++)
          nn.add(nb[j], .4 * (1 - pos.distanceTo(nb[j].p) / (cr * .4)));
      }
    }
    for (let i = 0; i < Math.floor(15 * df); i++) {
      let c1 = clNs[Math.floor(Math.random() * clNs.length)], c2;
      do { c2 = clNs[Math.floor(Math.random() * clNs.length)]; } while (c2 === c1);
      const bp = new THREE.Vector3().lerpVectors(c1.p, c2.p, .3 + Math.random() * .4).add(new THREE.Vector3(R(5), R(5), R(5)));
      const bn = new Nd(bp, 2, 0); bn.d = root.p.distanceTo(bp); ns.push(bn); c1.add(bn, .5); c2.add(bn, .5);
      const nb = ns.filter(n => n !== bn && n !== c1 && n !== c2 && n.p.distanceTo(bp) < 8);
      if (nb.length) bn.add(nb[Math.floor(Math.random() * nb.length)], .4);
    }
  }

  if (df < 1) {
    ns = ns.filter((n, i) => n === root || ((i * 31 + Math.floor(df * 100)) % 100) < (df * 100));
    ns.forEach(n => { n.c = n.c.filter(x => ns.includes(x.n)); });
  }
  return { ns, root };
}
