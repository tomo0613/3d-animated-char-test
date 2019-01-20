export {
    loadModel
};

function loadModel(resourceUrl) {
    const loader = new THREE.GLTFLoader();

    return new Promise((resolve, reject) => {
        const onLoad = (resource) => resolve(resource);
        const onProgress = () => {};
        const onError = (e) => {
            console.error('Failed to load resource: ' + e.target.src);
            reject(e);
        };

        loader.load(resourceUrl, onLoad, onProgress, onError);
    });
}
