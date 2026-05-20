/**
 * 2D canvas feedback ping-pong and display quad render.
 */

/**
 * Run shader feedback + blend ping-pong when gallery is not active.
 * @returns {import('three').Texture} display texture for the display quad
 */
export function runCanvas2DFrameLoop({
    renderer,
    uniforms,
    shaderScene,
    shaderCamera,
    blendScene,
    blendMaterial,
    feedbackReadRef,
    feedbackWriteRef,
    blendReadRef,
    blendWriteRef,
    feedbackPingIndexRef,
    blendPingFlipRef,
    galleryInitializedRef,
    galleryWarmupRef,
}) {
    galleryInitializedRef.current = false;
    galleryWarmupRef.current = false;
    if (uniforms.u_galleryFaceIndex) uniforms.u_galleryFaceIndex.value = -1;

    const feedbackRead =
        feedbackPingIndexRef.current === 0
            ? feedbackReadRef.current
            : feedbackWriteRef.current;
    const feedbackWrite =
        feedbackPingIndexRef.current === 0
            ? feedbackWriteRef.current
            : feedbackReadRef.current;

    uniforms.u_feedback_texture.value = feedbackRead.texture;
    renderer.setRenderTarget(feedbackWrite);
    renderer.clear();
    renderer.render(shaderScene, shaderCamera);
    feedbackPingIndexRef.current = 1 - feedbackPingIndexRef.current;

    const freshFeedback = feedbackWrite.texture;
    const blendSource = blendPingFlipRef.current ? blendReadRef.current : blendWriteRef.current;
    const blendDest = blendPingFlipRef.current ? blendWriteRef.current : blendReadRef.current;

    if (blendMaterial?.uniforms) {
        const blendUniforms = blendMaterial.uniforms;
        blendUniforms.u_textureA.value = blendSource.texture;
        blendUniforms.u_textureB.value = freshFeedback;
        const blendFactor = 1;
        if (blendUniforms.u_blendFactor && blendUniforms.u_blendFactor.value !== blendFactor) {
            blendUniforms.u_blendFactor.value = blendFactor;
        }
    } else if (blendMaterial) {
        console.error('Blend material exists, but its uniforms are missing in animate loop.');
    }

    renderer.setRenderTarget(blendDest);
    renderer.clear();
    renderer.render(blendScene, shaderCamera);

    return { displayTexture: blendDest.texture };
}

export function renderDisplayQuad({
    renderer,
    displayScene,
    displayMaterial,
    displayMesh,
    shaderCamera,
    displayTexture,
}) {
    renderer.setRenderTarget(null);
    renderer.clear();
    if (displayMesh && displayTexture) {
        displayMaterial.map = displayTexture;
    }
    renderer.render(displayScene, shaderCamera);
}
