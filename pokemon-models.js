// Locally modeled characters: every visible body part is lit, volumetric geometry.
// Models face +Z. Animation is applied to joint groups, never billboard textures.
export function createPokemonModel(THREE, name) {
  const root = new THREE.Group();
  root.name = name;
  const body = new THREE.Group();
  root.add(body);
  const palette = new Map();
  const sphere = new THREE.SphereGeometry(1, 20, 14);
  const eyes = [];
  const joints = {};
  function material(color, glossy = false) {
    const key = color + ':' + glossy;
    if (!palette.has(key)) palette.set(key, new THREE.MeshStandardMaterial({
      color, roughness: glossy ? .24 : .72, metalness: 0
    }));
    return palette.get(key);
  }
  function solid(geometry, color, parent, x = 0, y = 0, z = 0, glossy = false) {
    const m = new THREE.Mesh(geometry, material(color, glossy));
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function ball(parent, color, x, y, z, sx, sy, sz, glossy = false) {
    const m = solid(sphere, color, parent, x, y, z, glossy);
    m.scale.set(sx, sy, sz);
    return m;
  }
  function joint(parent, x, y, z, key) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.name = key || 'joint';
    parent.add(g);
    if (key) joints[key] = g;
    return g;
  }
  function eye(parent, x, y, z, size = .09, brown = false) {
    const g = joint(parent, x, y, z);
    ball(g, brown ? 0x39201a : 0x17151b, 0, 0, 0, size, size * 1.3, size * .6, true);
    ball(g, 0xffffff, -.024, size * .48, size * .49, size * .29, size * .34, size * .15, true);
    if (brown) ball(g, 0xb9813d, 0, -size * .56, size * .48, size * .56, size * .22, size * .18);
    eyes.push(g);
    return g;
  }
  let height, animateBody;
  if (name === 'Diglett' || name === 'Dugtrio') {
    const trio = name === 'Dugtrio';
    const mound = joint(body, 0, 0, 0, 'mound');
    const moundRadius = trio ? 1.05 : .65;
    ball(mound, 0x755239, 0, .08, 0, moundRadius, .16, moundRadius * .72);
    for (let i = 0; i < (trio ? 13 : 9); i++) {
      const a = i * 2.399, r = moundRadius * (.74 + (i % 3) * .09);
      const m = solid(new THREE.DodecahedronGeometry(.17 + i % 3 * .035, 0),
        i % 2 ? 0xa27b50 : 0x89603d, mound, Math.cos(a) * r, .13, Math.sin(a) * r * .72);
      m.scale.y = .65;
      m.rotation.set(i * .7, i, i * .4);
    }
    const specs = trio ? [[0, -.18, 1.72, 1], [-.49, .23, 1.15, .85], [.49, .28, 1.36, .88]] : [[0, 0, 1.43, 1]];
    const heads = specs.map(([x, z, h, scale], i) => {
      const g = joint(body, x, 0, z, 'head' + i);
      const radius = .39 * scale;
      const geometry = new THREE.CapsuleGeometry(radius, h - radius * 2, 7, 18);
      solid(geometry, i === 1 ? 0x986335 : 0xa66d3d, g, 0, h / 2, 0);
      for (const side of [-1, 1]) eye(g, side * .128 * scale, h - .32 * scale, radius * .91, .05 * scale);
      ball(g, 0xec9ca6, 0, h - .49 * scale, radius * 1.06, .17 * scale, .095 * scale, .095 * scale, true);
      ball(g, 0xffc5c3, -.035 * scale, h - .464 * scale, radius * 1.24, .046 * scale, .022 * scale, .014);
      return g;
    });
    height = trio ? 1.94 : 1.65;
    animateBody = (t, move, happy) => {
      heads.forEach((g, i) => {
        const burrow = move ? Math.sin(t * 9 + i * 1.8) * .14 - .07 : Math.sin(t * 2.5 + i * 1.6) * .045;
        g.position.y = burrow + happy * Math.abs(Math.sin(t * 10 + i * 1.5)) * .4;
        g.rotation.z = Math.sin(t * (happy ? 8 : 2) + i) * (happy ? .12 : .035);
        g.rotation.y = Math.sin(t * 1.2 + i * .7) * .12;
      });
      mound.rotation.y = Math.sin(t * 8) * move * .025;
      mound.scale.setScalar(1 + Math.sin(t * 10) * move * .035);
    };
  } else {
    throw new Error('Unknown Pokémon model: ' + name);
  }
  let movement = 0;
  return {
    root, height, joints,
    update(dt, time, moving = false, celebration = 0, phase = 0) {
      movement += ((moving ? 1 : 0) - movement) * (1 - Math.exp(-dt * 12));
      const happy = Math.min(1, Math.max(0, celebration) * 3);
      const t = time + phase * 1.37;
      animateBody(t, movement, happy);
      const blinkTime = (t + phase) % 4.7;
      const blink = blinkTime < .13 ? .13 + .87 * Math.abs(blinkTime - .065) / .065 : 1;
      eyes.forEach(e => { e.scale.y = blink; });
    }
  };
}
