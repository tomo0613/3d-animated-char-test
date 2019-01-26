import * as utils from './utils.js';

const viewWidth = 512;
const viewHeight = 512;
const aspectRatio = viewWidth / viewHeight;
const gCamera = new THREE.PerspectiveCamera(45, aspectRatio, 0.1, 1000);
const gScene = new THREE.Scene();
const gClock = new THREE.Clock();
const gRenderer = new THREE.WebGLRenderer({alpha: true});
gRenderer.gammaFactor = 1.8;
gRenderer.gammaOutput = true;

gCamera.position.x = -25;
gCamera.position.y = 10;

const cameraController = new THREE.OrbitControls(gCamera);
cameraController.target = new THREE.Vector3(0, 0, 0);
cameraController.minDistance = 2;
cameraController.update();

let gAnimationMixer;
gRenderer.setSize(viewWidth, viewHeight);
document.body.appendChild(gRenderer.domElement);

const boneLinks = [];
const boneLinkMap = {
    'Mh_female_RightFoot': 'Armature_Bone',
    'Mh_female_RightToeBase': 'Armature_FrontBone',
};

(async function init() {
    const [characterBlend, shoeBlend] = await Promise.all([
        await utils.loadModel('model/mh-female-character-humanik-1uv.gltf'),
        await utils.loadModel('model/mh-shoe.gltf'),
    ]);

    [characterBlend, shoeBlend].forEach(({scene}) => setMaterial(scene));

    const character = characterBlend.scene.children[0];
    const shoe = shoeBlend.scene;

    shoe.scale.set(1.1, 1.1, 1.1);
    // shoe.rotation.set(-Math.PI / 2, 0, 0);
    // shoe.position.set(-0.05, -0.45, 0.25);
    shoe.rotation.set(-1, 0, 0);
    shoe.position.set(0, -2.5, -1);

    console.log(shoe);
    

    character.traverse((child) => {
        if (child.isBone && child.name === 'Mh_female_RightFoot') {
            child.add(shoe);
        }
    
        if (child.isBone && boneLinkMap[child.name]) {
            shoe.traverse((shoeChild) => {
                if (shoeChild.isBone && shoeChild.name === boneLinkMap[child.name]) {
                    boneLinks.push({
                        target: shoeChild,
                        origin: child,
                    });
                }
            });
        }
    });

    gScene.add(character);
    // gScene.add(shoe);
    // character.add(gCamera);

    gAnimationMixer = new THREE.AnimationMixer(character);
    initAnimationController(characterBlend.animations);
    
    render();
})();

function setMaterial(scene) {
    const material = new THREE.MeshBasicMaterial();

    material.alphaTest = 0.5;
    material.skinning = true;
    
    scene.traverse((child) => {
        if (child.material) {
            material.map = child.material.map;
            child.material = material;
            child.material.needsUpdate = true;
        }
    });
}

function animate() {
    const elapsedTime = gClock.getDelta() * 0.5;

    boneLinks.forEach(({origin, target}) => {
        target.position.copy(origin.position);
        target.quaternion.copy(origin.quaternion);
    });

    gAnimationMixer.update(elapsedTime);
}

function render() {
    animate();

    gRenderer.render(gScene, gCamera);

    requestAnimationFrame(render);
}

function initAnimationController(animations) {
    const getClip = (name) => THREE.AnimationClip.findByName(animations, name);
    const getAction = (clip) => gAnimationMixer.clipAction(clip);
    const controllerContainer = document.createElement('aside');
    controllerContainer.id = 'controllerContainer';
    
    const walkClip = getClip('walk_cycle');
    const walkAction = getAction(walkClip);
    const idleClip = getClip('idle');
    const idleAction = getAction(idleClip);
    
    initAnimationAction(idleAction, {timeScale: 0.5, weight: 1});
    initAnimationAction(walkAction);

    addEventListener('keydown', (e) => {
        // if (e.key === ' ' && !meshAdded) {
        //     boneReference.add(wearable);
        //     meshAdded = true;
        // }
        if (e.key === 'w' && !e.repeat) {
            crossFadeAnimationAction(idleAction, walkAction, 0.5);
        }
    });
    addEventListener('keyup', (e) => {
        if (e.key === 'w') {
            crossFadeAnimationAction(walkAction, idleAction, 0.5);
        }
    });
    
    animations.forEach((animation) => controllerContainer.appendChild(createController(animation)));

    document.documentElement.appendChild(controllerContainer);
}

function initAnimationAction(action, options = {}) {
    action.setEffectiveTimeScale(options.timeScale || 0);
    action.setEffectiveWeight(options.weight || 0);
    action.play();
}

let timerId;
let step;
const totalSteps = 10;
function crossFadeAnimationAction(actionToFadeOut, actionToFadeIn, duration) {
    // actionToFadeIn.setEffectiveWeight(weightOfActionToFadeOut);
    actionToFadeIn.setEffectiveTimeScale(1);
    actionToFadeIn.enabled = true;
    actionToFadeIn.time = 0;
    actionToFadeIn.crossFadeFrom(actionToFadeOut, duration);
    
    step = 0;
    clearInterval(timerId);
    timerId = setInterval(() => {
        step++;
        actionToFadeIn.setEffectiveWeight(1 / totalSteps * step);
        if (step === totalSteps) {
            clearInterval(timerId);
        }
    }, duration * 1000 / totalSteps);
}

function createController(animation) {
    const animationClip = gAnimationMixer.clipAction(animation);

    const controllerCheckbox = document.createElement('input');
    controllerCheckbox.type = 'checkbox';
    controllerCheckbox.addEventListener('change', (e) => {
        const action = e.currentTarget.checked ? 'play' : 'stop';
        console.log(action + ' animation: ' + animation.name);
        animationClip[action]();
    });

    const controllerLabel = document.createElement('label');
    controllerLabel.textContent = animation.name;
    controllerLabel.appendChild(controllerCheckbox);

    const controllerElement = document.createElement('div');
    controllerElement.appendChild(controllerLabel);

    return controllerElement;
}
