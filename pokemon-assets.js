import { GLTFLoader } from './GLTFLoader.js';

export async function loadDetailedPokemon(THREE) {
  const loader = new GLTFLoader();
  const entries = await Promise.all(['Pikachu', 'Eevee'].map(async name => {
    const asset = await loader.loadAsync('./' + name.toLowerCase() + '.glb');
    return [name, createAnimatedPokemon(THREE, name, asset)];
  }));
  return Object.fromEntries(entries);
}

export function createAnimatedPokemon(THREE, name, asset) {
  const root = new THREE.Group(), normalized = new THREE.Group();
  root.name = name;
  root.add(normalized);
  normalized.add(asset.scene);
  const mixer = new THREE.AnimationMixer(asset.scene);
  const actions = Object.fromEntries(asset.animations.map(clip => [clip.name, mixer.clipAction(clip)]));
  if (!actions.idle || !actions.walk || !actions.run || !actions.happy) throw new Error(name + ' is missing character animations');
  let current = 'idle';
  actions.idle.play();
  mixer.update(.001);
  asset.scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(asset.scene);
  const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
  const origin = asset.scene.getObjectByName('origin')?.getWorldPosition(new THREE.Vector3()) || center;
  const height = name === 'Pikachu' ? 2.7 : 2.4;
  const scale = height / size.y;
  normalized.scale.setScalar(scale);
  normalized.position.set(-origin.x * scale, -bounds.min.y * scale, -origin.z * scale);
  asset.scene.traverse(part => {
    if (!part.isMesh) return;
    part.castShadow = part.receiveShadow = true;
    // Animated limbs can extend outside a mesh's bind-pose bounding volume.
    part.frustumCulled = false;
    const materials = Array.isArray(part.material) ? part.material : [part.material];
    materials.forEach(material => {
      material.metalness = 0;
      material.roughness = Math.max(.65, material.roughness || 0);
    });
  });
  return {
    root, height, mixer, actions,
    greetingDuration: actions.happy.getClip().duration,
    preparePick() {
      root.updateMatrixWorld(true);
      asset.scene.traverse(part => {
        if (!part.isSkinnedMesh) return;
        part.skeleton.update();
        part.computeBoundingSphere();
        if (part.boundingBox) part.computeBoundingBox();
      });
    },
    update(dt, time, moving = false, celebration = 0, phase = 0, following = false) {
      const next = celebration > 0 ? 'happy' : moving ? following ? 'run' : 'walk' : 'idle';
      if (next !== current) {
        const previous = actions[current], action = actions[next];
        action.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();
        previous.crossFadeTo(action, .18, false);
        current = next;
      }
      mixer.update(dt);
      root.updateMatrixWorld(true);
    }
  };
}
