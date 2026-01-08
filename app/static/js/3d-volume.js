import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DragControls } from 'three/addons/controls/DragControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import Common from './Common.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const common = new Common();

let container, scene, objCamera, uiScene, uiCamera, uiAxes, renderer, controls, mesh, loadingBox;
let volFolder, thresholdMinCon, thresholdMaxCon, lngMinCon, lngMaxCon, depthMinCon, depthMaxCon, latMinCon, latMaxCon;
let vismFolder, vismCon, lightCon, alphaCon, stepsCon, dataFolder, variCon, dateCon, timeCon, playerCon;

let playerId = null;
const clipMax = new THREE.Vector3(.5, .5, .5);
const clipMin = new THREE.Vector3(-.5, -.5, -.5);

let psalTexture, potempTexture, uvelTexture, vvelTexture, wvelTexture, colorTexture;

// const parameters = {
//     steps: 2000, light: false,
//     vism: 0, alpha: 1, play: () => { }, reset: () => { }, multivariables: false, psal: false, potemp: false, uvel: false, vvel: false, wvel: false,
//     date: common.dates[0],
//     time: 0,
// };

async function loadShader(url) {
    const res = await fetch(url);
    return await res.text();
}

const dustVertexShader = await loadShader(
    '/static/shaders/dustVertex.glsl'
);
const dustFragmentShader = await loadShader(
    '/static/shaders/dustFragment.glsl'
);

console.log('dustVertexShader:', dustVertexShader);

export async function init(id) {
    container = document.getElementById(`${id}`);
    await common.init();

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    objCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    // objCamera.position.set(2, 1.2, 0.5);
    objCamera.position.set(0.3, 1, -2);
    objCamera.lookAt(0, 0, 0);

    // Add loading animation box
    const loadingGeometry = new THREE.BoxGeometry(1, 1, 1, 5, 2, 5);
    const loadingGeometryMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
    loadingBox = new THREE.Mesh(loadingGeometry, loadingGeometryMaterial);
    loadingBox.scale.set(0.5, 0.1, .5);
    scene.add(loadingBox);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.autoClear = false;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(objCamera, renderer.domElement);
    controls.addEventListener('change', render);

    window.addEventListener('resize', onWindowResize);

    loadVolumeWithLoading();
}

let circles;
function createAxesWithDraggableCircles() {
    // Create the container div

    let width = 300, height = 200;
    let xlenth = 220, ylenth = 120;
    let x0 = 30, y0 = height - x0,
        x1 = x0 + xlenth, y1 = y0,
        x2 = x0, y2 = y0 - ylenth,
        x3 = x1 * 0.7, y3 = y2 * 1.3,
        k = (y0 - y3) / (x3 - x0);
    console.log(x0, y0, x1, y1, x2, y2, x3, y3, k);
    let circleOffset = 20, circleRadius = 8;
    circles = [
        [x0 + circleOffset, y0, x1, y1],
        [x0, y0 - circleOffset, x2, y2],
        [x0 + circleOffset, y0 - circleOffset * k, x3, y3]
    ]

    let container = d3.select('#axes-container');
    if (container.empty()) {
        container = d3.select('body')
            .append('div')
            .attr('id', 'axes-container')
            .style('position', 'absolute')
            .style('top', '10px')
            .style('left', '10px')
            .style('width', `${width}px`)
            .style('height', `${height}px`)
            .style('background-color', 'rgba(255, 255, 255, 0.8)')
            .style('border-radius', '8px')
            .style('box-shadow', '0 2px 5px rgba(0, 0, 0, 0.3)')
            .style('z-index', '1000');
    } else {
        container.html('');
    }

    // Create the SVG element
    const svg = container.append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('display', 'block');

    // Define the axes
    const axes = [
        { id: 'x', x1: x0, y1: y0, x2: x1, y2: y1, color: 'red', label: 'Longitude' }, // X-axis longitude
        { id: 'y', x1: x0, y1: y0, x2: x2, y2: y2, color: 'green', label: 'Depth' }, // Y-axis depth
        { id: 'z', x1: x0, y1: y0, x2: x3, y2: y3, color: 'blue', label: 'Latitude' } // Z-axis latitude
    ];

    // Add the axes to the SVG
    const axisGroups = svg.selectAll('.axis-group')
        .data(axes)
        .enter()
        .append('g');

    axisGroups.append('line')
        .attr('id', d => `axis-${d.id}`)
        .attr('x1', d => d.x1)
        .attr('y1', d => d.y1)
        .attr('x2', d => d.x2)
        .attr('y2', d => d.y2)
        .attr('stroke', d => d.color)
        .attr('stroke-width', 2);

    axisGroups.append('text')
        .attr('x', d => {
            if (d.id === 'x') return d.x2 - 28;
            if (d.id === 'y') return d.x2 - 15;
            if (d.id === 'z') return d.x2 - 20;
        })
        .attr('y', d => {
            if (d.id === 'x') return d.y2 + 23;
            if (d.id === 'y') return d.y2 - 15;
            if (d.id === 'z') return d.y2 - 15;
        })
        .attr('fill', d => d.color)
        .attr('font-size', '12px')
        .attr('font-family', 'Arial')
        .text(d => d.label);

    // Add two draggable circles to each axis
    axisGroups.selectAll('.draggable-circle')
        .data((d, i) => [
            {
                axis: d.id,
                x: circles[i][0], // First circle's x-coordinate
                y: circles[i][1], // First circle's y-coordinate
                color: d.color,
                index: 0 // First circle
            },
            {
                axis: d.id,
                x: circles[i][2], // Second circle's x-coordinate
                y: circles[i][3], // Second circle's y-coordinate
                color: d.color,
                index: 1 // Second circle
            }
        ])
        .enter()
        .append('circle')
        // .attr('class', 'draggable-circle')
        .attr('id', d => `circle-${d.axis}-${d.index}`)
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
        .attr('r', circleRadius)
        .attr('fill', d => d.color)
        .style('cursor', 'pointer')
        .call(
            d3.drag()
                .on('start', function (event, d) {
                    d3.select(this).raise().attr('stroke', 'black');
                })
                .on('drag', function (event, d) {
                    const circle = d3.select(this);
                    // console.log('Dragging circle:', d.axis, d.index, event.x, event.y, circle.attr('cx'), circle.attr('cy'));
                    let x = event.x;
                    let y = event.y;
                    if (d.axis === 'x') {
                        if (d.index === 0) {
                            const circle1 = parseFloat(d3.select(`#circle-${d.axis}-1`).attr('cx'));
                            // x = Math.max(circles[0][0], Math.min(circle1 - circleRadius * 2, event.x));
                            x = Math.max(circles[0][0], Math.min(circle1, event.x));
                            clipMax.x = 0.5 - (x - circles[0][0]) / (circles[0][2] - circles[0][0]);
                        } else {
                            const circle0 = parseFloat(d3.select(`#circle-${d.axis}-0`).attr('cx'));
                            // x = Math.max(circle0 + circleRadius * 2, Math.min(circles[0][2], event.x));
                            x = Math.max(circle0, Math.min(circles[0][2], event.x));
                            clipMin.x = -0.5 + (circles[0][2] - x) / (circles[0][2] - circles[0][0]);
                        }
                        y = d.y;
                    } else if (d.axis === 'y') {
                        if (d.index === 0) {
                            const circle1 = parseFloat(d3.select(`#circle-${d.axis}-1`).attr('cy'));
                            // y = Math.max(circle1 + circleRadius * 2, Math.min(circles[1][1], event.y));
                            y = Math.max(circle1, Math.min(circles[1][1], event.y));
                            clipMin.y = -0.5 + (circles[1][1] - y) / (circles[1][1] - circles[1][3]);
                        } else {
                            const circle0 = parseFloat(d3.select(`#circle-${d.axis}-0`).attr('cy'));
                            // y = Math.max(circles[1][3], Math.min(circle0 - circleRadius * 2, event.y));
                            y = Math.max(circles[1][3], Math.min(circle0, event.y));
                            clipMax.y = 0.5 - (y - circles[1][3]) / (circles[1][1] - circles[1][3]);
                        }
                        x = d.x;
                    } else if (d.axis === 'z') {
                        if (d.index === 0) {
                            const circle1 = parseFloat(d3.select(`#circle-${d.axis}-1`).attr('cx'));
                            x = Math.max(circles[2][0], Math.min(circle1, event.x));
                            y = y0 - (x - x0) * k;
                            clipMin.z = -0.5 + (x - circles[2][0]) / (circles[2][2] - circles[2][0]);
                        } else {
                            const circle0 = parseFloat(d3.select(`#circle-${d.axis}-0`).attr('cx'));
                            x = Math.max(circle0, Math.min(circles[2][2], event.x));
                            y = y0 - (x - x0) * k;
                            clipMax.z = 0.5 - (circles[2][2] - x) / (circles[2][2] - circles[2][0]);
                        }
                    }
                    circle.attr('cx', x).attr('cy', y);
                    d.x = x;
                    d.y = y;
                })
                .on('end', function () {
                    d3.select(this).attr('stroke', null);
                })
        );
}




let topSlider, bottomSlider;

function createLegendWithSliders(data, onSliderChange) {
    let container = document.getElementById('legend-container');
    if (container) {
        container.innerHTML = '';
    } else {
        container = document.createElement('div');
        container.id = 'legend-container';
        container.style.position = 'absolute';
        container.style.bottom = '10px';
        container.style.left = '10px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'center';
        container.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        container.style.padding = '10px';
        container.style.borderRadius = '8px';
        container.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.3)';
        container.style.zIndex = '1000';
        document.body.appendChild(container);
    }

    const contentWrapper = document.createElement('div');
    contentWrapper.style.display = 'flex';
    contentWrapper.style.flexDirection = 'row';
    contentWrapper.style.alignItems = 'center';

    const canvas = document.createElement('canvas');
    const legendWidth = 50;
    const legendHeight = 300;
    const margin = 6;
    canvas.width = legendWidth;
    canvas.height = legendHeight + 2 * margin;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, margin, 0, legendHeight);
    for (let i = 0; i < data.length; i++) {
        gradient.addColorStop(data[i][0], data[i][2]);
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, margin, legendWidth / 5 * 2, legendHeight);
    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < data.length; i++) {
        const y = legendHeight * (1 - data[i][0]);
        ctx.fillText(data[i][1], legendWidth / 5 * 2 + 5, y + margin);
    }

    // Create the slider container
    const sliderContainer = document.createElement('div');
    sliderContainer.style.position = 'relative';
    sliderContainer.style.height = `${legendHeight}px`;
    sliderContainer.style.width = '20px';
    sliderContainer.style.marginRight = '10px';

    topSlider = document.createElement('div');
    topSlider.style.position = 'absolute';
    topSlider.style.width = '20px';
    topSlider.style.height = '10px';
    topSlider.style.backgroundColor = '#000000';
    topSlider.style.cursor = 'pointer';
    topSlider.style.borderRadius = '5px';
    topSlider.style.top = '0px';

    bottomSlider = document.createElement('div');
    bottomSlider.style.position = 'absolute';
    bottomSlider.style.width = '20px';
    bottomSlider.style.height = '10px';
    bottomSlider.style.backgroundColor = '#000000';
    bottomSlider.style.cursor = 'pointer';
    bottomSlider.style.borderRadius = '5px';
    bottomSlider.style.top = `${legendHeight - 10}px`;

    sliderContainer.appendChild(topSlider);
    sliderContainer.appendChild(bottomSlider);
    contentWrapper.appendChild(sliderContainer);
    contentWrapper.appendChild(canvas);
    // container.appendChild(sliderContainer);
    container.appendChild(contentWrapper);

    const legendLabel = document.createElement('div');
    legendLabel.textContent = `${common.parameters.name} (${common.parameters.unit})`;
    legendLabel.style.marginTop = '10px';
    legendLabel.style.fontSize = '14px';
    legendLabel.style.color = '#000';
    legendLabel.style.textAlign = 'center';
    container.appendChild(legendLabel);

    // Slider dragging logic
    let isDraggingTop = false;
    let isDraggingBottom = false;

    topSlider.addEventListener('mousedown', () => {
        isDraggingTop = true;
    });

    bottomSlider.addEventListener('mousedown', () => {
        isDraggingBottom = true;
    });

    document.addEventListener('mouseup', () => {
        isDraggingTop = false;
        isDraggingBottom = false;
    });

    document.addEventListener('mousemove', (event) => {
        if (isDraggingTop || isDraggingBottom) {
            const rect = sliderContainer.getBoundingClientRect();
            const y = Math.min(Math.max(event.clientY - rect.top, 0), legendHeight - 10);

            if (isDraggingTop) {
                topSlider.style.top = `${Math.min(y, parseFloat(bottomSlider.style.top))}px`;
            } else if (isDraggingBottom) {
                bottomSlider.style.top = `${Math.max(y, parseFloat(topSlider.style.top))}px`;
            }

            // Calculate the normalized values for the sliders
            const topValue = 1 - parseFloat(topSlider.style.top) / (legendHeight - 10);
            const bottomValue = 1 - parseFloat(bottomSlider.style.top) / (legendHeight - 10);

            if (onSliderChange) {
                onSliderChange(topValue, bottomValue);
            }
        }
    });
}

function resetSliders() {
    const legendHeight = 300;
    topSlider.style.top = '0px';
    bottomSlider.style.top = `${legendHeight - 10}px`;
}


async function loadVolumeWithLoading() {
    // Show loading animation
    loadingBox.visible = true;
    if (mesh) mesh.visible = false;

    // Load data asynchronously
    await loadDust();

    // Hide loading animation and show data
    loadingBox.visible = false;
    if (mesh) {
        mesh.visible = true;
    }
}

async function loadDust() {
    const dust = await common.loadDustTexture();
    const colorTable = await common.loadColorTableTexture();
    const dataTexture = new THREE.Data3DTexture(dust, common.dust_dimensions[2].length, common.dust_dimensions[0].length, common.dust_dimensions[1].length);
    dataTexture.format = THREE.RedFormat;
    dataTexture.type = THREE.FloatType;
    // dataTexture.minFilter = THREE.NearestMipmapLinearFilter;
    // dataTexture.magFilter = THREE.NearestFilter;
    dataTexture.minFilter = THREE.LinearFilter;
    dataTexture.magFilter = THREE.LinearFilter;
    dataTexture.generateMipmaps = false;
    dataTexture.unpackAlignment = 1;
    dataTexture.needsUpdate = true;

    colorTexture = new THREE.DataTexture(colorTable, 256, 1);
    colorTexture.format = THREE.RGBAFormat;
    colorTexture.type = THREE.UnsignedByteType;
    colorTexture.minFilter = THREE.LinearFilter;
    colorTexture.magFilter = THREE.LinearFilter;
    colorTexture.unpackAlignment = 1;
    colorTexture.needsUpdate = true;

    if (!mesh) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.RawShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                dataTexture: { value: dataTexture },
                colorTexture: { value: colorTexture },
                cameraPos: { value: new THREE.Vector3() },
                lightPos: { value: new THREE.Vector3(3.0, -3.0, .0) },
                tmin: { value: 0 },
                tmax: { value: 100000 },
                steps: { value: 2000 },
                vmin: { value: 1000 },
                vmax: { value: 10000 },
                clipMax: { value: clipMax },
                clipMin: { value: clipMin },
                alpha: { value: 1 },

            },
            vertexShader: dustVertexShader,
            fragmentShader: dustFragmentShader,
            side: THREE.BackSide,
        });

        mesh = new THREE.Mesh(geometry, material);
        const line = new THREE.LineSegments(
            new THREE.EdgesGeometry(geometry),
            new THREE.LineBasicMaterial({ color: 0x999999 })
        );
        mesh.add(line);

        const scaleZ = common.dust_dimensions[0].length / Math.max(common.dust_dimensions[1].length, common.dust_dimensions[2].length); // ≈ 29 / 549
        console.log('scaleZ:', scaleZ);
        mesh.scale.set(1, scaleZ*1.4, 1);

        mesh.position.set(0, 0, 0);
        scene.add(mesh);

        // createLegendWithSliders(await common.loadLegendSprite(), (topValue, bottomValue) => {
        //     mesh.material.uniforms.tmin.value = common.parameters.min + (common.parameters.max - common.parameters.min) * bottomValue;
        //     mesh.material.uniforms.tmax.value = common.parameters.min + (common.parameters.max - common.parameters.min) * topValue;
        //     if (topValue == 1) {
        //         mesh.material.uniforms.tmax.value = common.parameters.tmax;
        //     }
        // });

        // createAxesWithDraggableCircles();
    } else {
        mesh.material.uniforms.dataTexture.value = dataTexture;
        mesh.material.uniforms.colorTexture.value = colorTexture;
        // mesh.material.uniforms.vmin.value = common.parameters.min;
        // mesh.material.uniforms.vmax.value = common.parameters.max;
        // mesh.material.uniforms.tmin.value = common.parameters.tmin;
        // mesh.material.uniforms.tmax.value = common.parameters.tmax;
        dataTexture.needsUpdate = true;
        colorTexture.needsUpdate = true;
        mesh.material.needsUpdate = true;
    }
}

function onWindowResize() {
    objCamera.aspect = window.innerWidth / window.innerHeight;
    objCamera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Update the uiCamera to match the new window size
    // uiCamera.left = 0;
    // uiCamera.right = window.innerWidth;
    // uiCamera.top = window.innerHeight;
    // uiCamera.bottom = 0;
    // uiCamera.updateProjectionMatrix();

    // Ensure uiAxes remains the same size
    // uiAxes.scale.set(1, 1, 1); // Keep the scale fixed
}

function animate() {

    // Animate loading box if visible
    if (loadingBox && loadingBox.visible) {
        loadingBox.rotation.x += 0.01;
        loadingBox.rotation.y += 0.01;
    }

    controls.update();
    render();
}

function render() {
    if (mesh != undefined) {
        mesh.material.uniforms.cameraPos.value.copy(objCamera.position);
    }
    // uiAxes.quaternion.copy(objCamera.quaternion);
    renderer.render(scene, objCamera);

    // renderer.clearDepth();
    // renderer.render(uiScene, uiCamera);
}

async function reload() {
    common.loadLegendSprite().then(sprite => uiScene.add(sprite));
    parameters.thresholdMin = common.parameters.tmin;
    parameters.thresholdMax = common.parameters.tmax;

    console.log('Reloading volume');
    console.log(common.parameters);
    if (common.parameters.v == 'vvel' || common.parameters.v == 'wvel' || common.parameters.v == 'uvel') {
        if (common.parameters.v == 'vvel' || common.parameters.v == 'uvel') {
            parameters.thresholdMin = Math.round((parameters.thresholdMin - 5) * 100) / 100;
            parameters.thresholdMax = Math.round((parameters.thresholdMax - 5) * 100) / 100;
        } else {
            parameters.thresholdMin = Math.round((parameters.thresholdMin - 5) * 10000) / 10000;
            parameters.thresholdMax = Math.round((parameters.thresholdMax - 5) * 10000) / 10000;
        }
    }

    mesh.material.uniforms.tmin.value = common.parameters.tmin;
    mesh.material.uniforms.tmax.value = common.parameters.tmax;

    if (common.parameters.v == 'vvel' || common.parameters.v == 'uvel') {
        thresholdMinCon.step(0.01);
        thresholdMaxCon.step(0.01);
    } else if (common.parameters.v == 'wvel') {
        thresholdMinCon.step(0.0001);
        thresholdMaxCon.step(0.0001);
    } else {
        thresholdMinCon.step(0.1);
        thresholdMaxCon.step(0.1);
    }

    thresholdMinCon.min(parameters.thresholdMin).max(parameters.thresholdMax).updateDisplay();
    thresholdMaxCon.min(parameters.thresholdMin).max(parameters.thresholdMax).updateDisplay();

    if (parameters.multivariables) {
        await variablesTexture();
        mesh.material.uniforms.psalTexture.value = psalTexture;
        mesh.material.uniforms.potempTexture.value = potempTexture;
        mesh.material.uniforms.uvelTexture.value = uvelTexture;
        mesh.material.uniforms.vvelTexture.value = vvelTexture;
        mesh.material.uniforms.wvelTexture.value = wvelTexture;
    }
    await loadVolume();
}

const play = async () => {
    if (playerId) {
        clearInterval(playerId);
        playerId = null;
    } else {
        playerId = setInterval(() => {
            parameters.time = parameters.time > 22 ? 0 : parameters.time + 1;
            timeCon.updateDisplay();
            common.time = parameters.time;
            loadVolume();
            // reload();
        }, 2000);
    }
}

async function reset() {

    parameters.vism = 0;
    mesh.material.uniforms.vism.value = parameters.vism;
    vismCon.updateDisplay();
    parameters.light = false;
    mesh.material.uniforms.light.value = parameters.light;
    lightCon.updateDisplay();

    // --- remove for fast visualization reset ----
    // parameters.alpha = 1;
    // mesh.material.uniforms.alpha.value = parameters.alpha;
    // alphaCon.updateDisplay();
    // parameters.steps = 2000;
    // mesh.material.uniforms.steps.value = parameters.steps;
    // stepsCon.updateDisplay();
    // --- do not reset current variable ---
    // common.parameters.v = 'psal';
    // common.ui_parameters.variable = 'psal';
    // common.parameters.min = common.variables[common.parameters.v][0];
    // common.parameters.max = common.variables[common.parameters.v][1];
    // common.parameters.tmin = common.variables[common.parameters.v][2];
    // common.parameters.tmax = common.variables[common.parameters.v][3];
    // variCon.updateDisplay();
    // --- do not reset current date and time ---
    // common.parameters.fn = '20221115';
    // common.ui_parameters.date = common.parameters.fn;
    // dateCon.updateDisplay();
    // common.parameters.t = 0;
    // common.ui_parameters.time = 0;
    // timeCon.updateDisplay();
    // await common.init();

    clipMax.x = .5; clipMax.y = .5; clipMax.z = .5;
    clipMin.x = -.5; clipMin.y = -.5; clipMin.z = -.5;
    mesh.material.uniforms.tmin.value = common.parameters.tmin;
    mesh.material.uniforms.tmax.value = common.parameters.tmax;

    // common.ui_parameters.longitude_min = 0;
    // lngMinCon.updateDisplay();
    // common.ui_parameters.longitude_max = common.parameters.xn - 1;
    // lngMaxCon.updateDisplay();
    // common.ui_parameters.depth_min = 0;
    // depthMinCon.updateDisplay();
    // common.ui_parameters.depth_max = common.parameters.yn - 1;
    // depthMaxCon.updateDisplay();
    // common.ui_parameters.latitude_min = 0;
    // latMinCon.updateDisplay();
    // common.ui_parameters.latitude_max = common.parameters.zn - 1;
    // latMaxCon.updateDisplay();
    // reload();
    // objCamera.position.set(-2, 1, 0);

    resetSliders();
    objCamera.position.set(-2, 1.2, -0.5);
}

function disableReload() {
    variCon.disable();
    dateCon.disable();
}

function enableReload() {
    variCon.enable();
    dateCon.enable();
}


/**
 * Draws a parallel coordinates plot in the uiScene next to the legend.
 * Uses the 5 variables: psal, potemp, uvel, vvel, wvel.
 * Colors the lines using colorTexture.
 */
// function drawParallelCoordinatesPlot() {
//     // Remove previous plot if exists
//     if (uiScene.getObjectByName('parallelCoords')) {
//         uiScene.remove(uiScene.getObjectByName('parallelCoords'));
//     }

//     // Parameters
//     const width = 0.4; // width of the plot in NDC
//     const height = 0.6; // height of the plot in NDC
//     const x0 = 0.65; // x offset (right of legend)
//     const y0 = 0.0; // y offset (centered)
//     const nAxes = 5;
//     const nSamples = 200; // number of lines to draw (subsample for performance)

//     // Get data from textures (assume Float32Array)
//     const xn = common.parameters.xn;
//     const yn = common.parameters.yn;
//     const zn = common.parameters.zn;
//     const total = xn * yn * zn;

//     // Helper to get value from Data3DTexture
//     function getVal(tex, idx) {
//         return tex.image.data[idx];
//     }

//     // Subsample indices
//     const indices = [];
//     for (let i = 0; i < nSamples; ++i) {
//         indices.push(Math.floor(Math.random() * total));
//     }

//     // Get min/max for normalization
//     const minmax = [
//         [common.variables.psal[0], common.variables.psal[1]],
//         [common.variables.potemp[0], common.variables.potemp[1]],
//         [common.variables.uvel[0], common.variables.uvel[1]],
//         [common.variables.vvel[0], common.variables.vvel[1]],
//         [common.variables.wvel[0], common.variables.wvel[1]],
//     ];

//     // Prepare geometry
//     const geometry = new THREE.BufferGeometry();
//     const positions = new Float32Array(nSamples * (nAxes - 1) * 2 * 3); // 2 points per segment, 3 coords
//     const colors = new Float32Array(nSamples * (nAxes - 1) * 2 * 3);

//     // For coloring, use psal as the main variable
//     function getColor(val) {
//         // Normalize to [0,1]
//         const norm = (val - minmax[0][0]) / (minmax[0][1] - minmax[0][0]);
//         // Sample colorTexture (assume 256x1 RGBA)
//         const idx = Math.floor(norm * 255);
//         const c = colorTexture.image.data;
//         return [
//             c[idx * 4] / 255,
//             c[idx * 4 + 1] / 255,
//             c[idx * 4 + 2] / 255
//         ];
//     }

//     // Fill geometry
//     let ptr = 0;
//     for (let s = 0; s < nSamples; ++s) {
//         const idx = indices[s];
//         const vals = [
//             getVal(psalTexture, idx),
//             getVal(potempTexture, idx),
//             getVal(uvelTexture, idx),
//             getVal(vvelTexture, idx),
//             getVal(wvelTexture, idx),
//         ];
//         // Normalize
//         for (let i = 0; i < nAxes; ++i) {
//             vals[i] = (vals[i] - minmax[i][0]) / (minmax[i][1] - minmax[i][0]);
//         }
//         // Draw polyline as segments between axes
//         for (let i = 0; i < nAxes - 1; ++i) {
//             // x: axis position, y: normalized value
//             const xA = x0 + (i / (nAxes - 1)) * width;
//             const yA = y0 + (vals[i] - 0.5) * height;
//             const xB = x0 + ((i + 1) / (nAxes - 1)) * width;
//             const yB = y0 + (vals[i + 1] - 0.5) * height;
//             positions.set([xA, yA, 0, xB, yB, 0], ptr * 3);
//             const color = getColor(vals[0]);
//             colors.set([...color, ...color], ptr * 3);
//             ptr += 2;
//         }
//     }

//     geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
//     geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

//     const material = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.3 });
//     const lines = new THREE.LineSegments(geometry, material);
//     lines.name = 'parallelCoords';
//     uiScene.add(lines);

//     // Draw axes
//     const axesGeom = new THREE.BufferGeometry();
//     const axesPos = new Float32Array(nAxes * 2 * 3);
//     for (let i = 0; i < nAxes; ++i) {
//         const x = x0 + (i / (nAxes - 1)) * width;
//         axesPos.set([x, y0 - height / 2, 0, x, y0 + height / 2, 0], i * 6);
//     }
//     axesGeom.setAttribute('position', new THREE.BufferAttribute(axesPos, 3));
//     const axesMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
//     const axes = new THREE.LineSegments(axesGeom, axesMat);
//     axes.name = 'parallelCoordsAxes';
//     uiScene.add(axes);
// }

// Call this function after textures are loaded and uiScene is ready
// Example: after loadVolume() or in animate/render loop (once)
// drawParallelCoordinatesPlot();


function drawParallelCoordinatesPlot() {
    // Remove previous plot if exists
    if (uiScene.getObjectByName('parallelCoords')) {
        uiScene.remove(uiScene.getObjectByName('parallelCoords'));
    }
    if (uiScene.getObjectByName('parallelCoordsAxes')) {
        uiScene.remove(uiScene.getObjectByName('parallelCoordsAxes'));
    }
    // Remove previous labels
    for (let obj of uiScene.children.filter(o => o.name && o.name.startsWith('parallelCoordsLabel'))) {
        uiScene.remove(obj);
    }

    // Parameters
    const width = 0.6; // width of the plot in NDC
    const height = 0.6; // height of the plot in NDC
    const x0 = 0.35; // x offset (right of legend)
    const y0 = 0.0; // y offset (centered)
    const nAxes = 5;
    // const nSamples = 1000 * 1000 * 50; // number of lines to draw (subsample for performance)
    const axisNames = ['psal', 'potemp', 'uvel', 'vvel', 'wvel'];

    // Get data from textures (assume Float32Array)
    const xn = common.parameters.xn;
    const yn = common.parameters.yn;
    const zn = common.parameters.zn;
    const total = xn * yn * zn;

    const MAX_LINES = 100; // or 5000, adjust as needed
    // let lineCount = 0;
    // const DRAW_PROB = MAX_LINES / total;

    const currentVariableIndex = ['psal', 'potemp', 'uvel', 'vvel', 'wvel'].indexOf(common.parameters.v);
    // console.log('Current variable index:', currentVariableIndex);

    // Helper to get value from Data3DTexture
    function getVal(tex, idx) {
        return tex.image.data[idx];
    }

    // Subsample indices
    // const indices = [];
    // for (let i = 0; i < nSamples; ++i) {
    //     indices.push(Math.floor(Math.random() * total));
    // }

    // Get min/max for normalization
    const minmax = [
        [common.variables.psal[0], common.variables.psal[1]],
        [common.variables.potemp[0], common.variables.potemp[1]],
        [common.variables.uvel[0], common.variables.uvel[1]],
        [common.variables.vvel[0], common.variables.vvel[1]],
        [common.variables.wvel[0], common.variables.wvel[1]],
    ];

    // console.log(minmax);

    // Prepare geometry
    // const geometry = new THREE.BufferGeometry();
    // const positions = new Float32Array(nSamples * (nAxes - 1) * 2 * 3); // 2 points per segment, 3 coords
    // const colors = new Float32Array(nSamples * (nAxes - 1) * 2 * 3);

    // For coloring, use psal as the main variable
    // function getColor(val) {
    //     // Normalize to [0,1]
    //     // let norm = (val - minmax[0][0]) / (minmax[0][1] - minmax[0][0]);
    //     // norm = Math.max(0, Math.min(1, norm));
    //     // Sample colorTexture (assume 256x1 RGBA)
    //     let color = [0, 0, 0];
    //     const c = colorTexture.image.data;
    //     if (parameters.psal) {
    //         const idx = Math.floor(val[0] * 255);
    //         color[0] += c[idx * 4] / 255;
    //         color[1] += c[idx * 4 + 1] / 255
    //         color[2] += c[idx * 4 + 2] / 255;
    //     }
    //     if (parameters.potemp) {
    //         const idx = Math.floor(val[1] * 255);
    //         color[0] += c[idx * 4] / 255;
    //         color[1] += c[idx * 4 + 1] / 255;
    //         color[2] += c[idx * 4 + 2] / 255;
    //     }
    //     if (parameters.uvel) {
    //         const idx = Math.floor(val[2] * 255);
    //         color[0] += c[idx * 4] / 255;
    //         color[1] += c[idx * 4 + 1] / 255;
    //         color[2] += c[idx * 4 + 2] / 255;
    //     }
    //     if (parameters.vvel) {
    //         const idx = Math.floor(val[3] * 255);
    //         color[0] += c[idx * 4] / 255;
    //         color[1] += c[idx * 4 + 1] / 255;
    //         color[2] += c[idx * 4 + 2] / 255;
    //     }
    //     if (parameters.wvel) {
    //         const idx = Math.floor(val[4] * 255);
    //         color[0] += c[idx * 4] / 255;
    //         color[1] += c[idx * 4 + 1] / 255;
    //         color[2] += c[idx * 4 + 2] / 255;
    //     }
    //     // const idx = Math.floor(val * 255);
    //     // const c = colorTexture.image.data;
    //     return [
    //         color[0] / 5,
    //         color[1] / 5,
    //         color[2] / 5
    //     ];
    // }

    function getColor(vals) {
        // vals: normalized [psal, potemp, uvel, vvel, wvel] in [0,1]
        let color = [0, 0, 0];
        let alpha = 0.0;
        let count = 0;
        const c = colorTexture.image.data;

        function sampleColor(norm) {
            const idx = Math.floor(norm * 255);
            return [
                c[idx * 4] / 255,
                c[idx * 4 + 1] / 255,
                c[idx * 4 + 2] / 255
            ];
        }

        // Collect enabled variables
        let colorSum = [0, 0, 0];
        let valueSum = 0;
        if (parameters.psal) {
            const col = sampleColor(vals[0]);
            colorSum[0] += col[0]; colorSum[1] += col[1]; colorSum[2] += col[2];
            valueSum += vals[0];
            count++;
        }
        if (parameters.potemp) {
            const col = sampleColor(vals[1]);
            colorSum[0] += col[0]; colorSum[1] += col[1]; colorSum[2] += col[2];
            valueSum += vals[1];
            count++;
        }
        if (parameters.uvel) {
            const col = sampleColor(vals[2]);
            colorSum[0] += col[0]; colorSum[1] += col[1]; colorSum[2] += col[2];
            valueSum += vals[2];
            count++;
        }
        if (parameters.vvel) {
            const col = sampleColor(vals[3]);
            colorSum[0] += col[0]; colorSum[1] += col[1]; colorSum[2] += col[2];
            valueSum += vals[3];
            count++;
        }
        if (parameters.wvel) {
            const col = sampleColor(vals[4]);
            colorSum[0] += col[0]; colorSum[1] += col[1]; colorSum[2] += col[2];
            valueSum += vals[4];
            count++;
        }
        // If none selected, default to psal
        // if (count === 0) {
        //     const col = sampleColor(vals[0]);
        //     colorSum[0] += col[0]; colorSum[1] += col[1]; colorSum[2] += col[2];
        //     valueSum += vals[0];
        //     count = 1;
        // }

        // count = count/2;
        // Alpha blending as in the shader
        // In the shader, color blending is iterative, but for a single line, we can use the final result:
        // color.rgb = (sum of selected variable colors) / count
        // alpha    = (sum of selected normalized values) / count
        // For visualization, you may want to apply alpha as well:
        alpha = valueSum / count;
        color = [
            colorSum[0] / count,
            colorSum[1] / count,
            colorSum[2] / count
        ];
        // Optionally, apply alpha to color for a similar effect:
        return [color[0] * alpha, color[1] * alpha, color[2] * alpha];
    }

    // --- Use dynamic arrays ---
    const positionsArr = [];
    const colorsArr = [];
    // let numberOfLines = 0;

    const filteredIndices = [];
    for (let idx = 0; idx < total; ++idx) {
        // Convert 1D idx to 3D coordinates
        const xi = idx % xn;
        const yi = Math.floor(idx / xn) % yn;
        const zi = Math.floor(idx / (xn * yn));

        // Normalize coordinates to [-0.5, 0.5] for comparison with clipMin/clipMax
        const xNorm = xi / (xn - 1) - 0.5;
        const yNorm = yi / (yn - 1) - 0.5;
        const zNorm = zi / (zn - 1) - 0.5;

        // Filter by clip box
        if (
            xNorm < clipMin.x || xNorm > clipMax.x ||
            yNorm < clipMin.y || yNorm > clipMax.y ||
            zNorm < clipMin.z || zNorm > clipMax.z
        ) {
            continue;
        }

        const vals = [
            getVal(psalTexture, idx),
            getVal(potempTexture, idx),
            getVal(uvelTexture, idx),
            getVal(vvelTexture, idx),
            getVal(wvelTexture, idx),
        ];

        // Filter by threshold for the main variable (e.g., psal)
        if (vals[currentVariableIndex] < parameters.thresholdMin || vals[currentVariableIndex] > parameters.thresholdMax) {
            continue;
        }

        filteredIndices.push(idx);
    }

    // console.log(filteredIndices);

    let selectedIndices = [];
    if (filteredIndices.length <= MAX_LINES) {
        selectedIndices = filteredIndices;
    } else {
        // Fisher-Yates shuffle for random unique selection
        const shuffled = filteredIndices.slice();
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        selectedIndices = shuffled.slice(0, MAX_LINES);
    }
    // console.log(selectedIndices);

    // Fill geometry
    // let ptr = 0;
    for (const idx of selectedIndices) {
        // const idx = indices[s];
        // const idx = s;
        // if (Math.random() > DRAW_PROB && numberOfLines <= MAX_LINES) continue;

        // Convert 1D idx to 3D coordinates
        // const xi = idx % xn;
        // const yi = Math.floor(idx / xn) % yn;
        // const zi = Math.floor(idx / (xn * yn));

        // Normalize coordinates to [-0.5, 0.5] for comparison with clipMin/clipMax
        // const xNorm = xi / (xn - 1) - 0.5;
        // const yNorm = yi / (yn - 1) - 0.5;
        // const zNorm = zi / (zn - 1) - 0.5;

        // Filter by clip box
        // if (
        //     xNorm < clipMin.x || xNorm > clipMax.x ||
        //     yNorm < clipMin.y || yNorm > clipMax.y ||
        //     zNorm < clipMin.z || zNorm > clipMax.z
        // ) {
        //     continue;
        // }

        const vals = [
            getVal(psalTexture, idx),
            getVal(potempTexture, idx),
            getVal(uvelTexture, idx),
            getVal(vvelTexture, idx),
            getVal(wvelTexture, idx),
        ];

        // Filter by threshold for the main variable (e.g., psal)
        // if (vals[currentVariableIndex] < parameters.thresholdMin || vals[currentVariableIndex] > parameters.thresholdMax) {
        //     continue;
        // }

        // Normalize
        // for (let i = 0; i < nAxes; ++i) {
        //     vals[i] = (vals[i] - minmax[i][0]) / (minmax[i][1] - minmax[i][0]);
        // }
        // Normalize and check validity
        // let valid = true;
        for (let i = 0; i < nAxes; ++i) {
            vals[i] = (vals[i] - minmax[i][0]) / (minmax[i][1] - minmax[i][0]);
            // if (vals[i] < 0 || vals[i] > 1 || isNaN(vals[i])) {
            //     valid = false;
            //     break;
            // }
            vals[i] = Math.max(0, Math.min(1, vals[i]));
        }
        // if (!valid) continue;

        // Draw polyline as segments between axes
        // for (let i = 0; i < nAxes - 1; ++i) {
        // x: axis position, y: normalized value
        // const xA = x0 + (i / (nAxes - 1)) * width;
        // const yA = y0 + (vals[i] - 0.5) * height;
        // const xB = x0 + ((i + 1) / (nAxes - 1)) * width;
        // const yB = y0 + (vals[i + 1] - 0.5) * height;
        // positions.set([xA, yA, 0, xB, yB, 0], ptr * 3);
        // const color = getColor(vals[0]);
        // colors.set([...color, ...color], ptr * 3);
        // ptr += 2;
        // }
        // Draw polyline as segments between axes
        for (let i = 0; i < nAxes - 1; ++i) {
            const xA = x0 + (i / (nAxes - 1)) * width;
            const yA = y0 + (vals[i] - 0.5) * height;
            const xB = x0 + ((i + 1) / (nAxes - 1)) * width;
            const yB = y0 + (vals[i + 1] - 0.5) * height;
            positionsArr.push(xA, yA, 0, xB, yB, 0);
            const color = getColor(vals);
            colorsArr.push(...color, ...color);
        }
        // lineCount++;
        // if (lineCount >= MAX_LINES) break;
        // numberOfLines++;
        // if (numberOfLines >= MAX_LINES) {
        // console.log(`Reached max lines: ${MAX_LINES}`);
        // break;
        // }
    }

    // --- Convert to typed arrays for BufferGeometry ---
    const positions = new Float32Array(positionsArr);
    const colors = new Float32Array(colorsArr);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.5 });
    const lines = new THREE.LineSegments(geometry, material);
    lines.name = 'parallelCoords';
    uiScene.add(lines);

    // Draw axes
    const axesGeom = new THREE.BufferGeometry();
    const axesPos = new Float32Array(nAxes * 2 * 3);
    for (let i = 0; i < nAxes; ++i) {
        const x = x0 + (i / (nAxes - 1)) * width;
        axesPos.set([x, y0 - height / 2, 0, x, y0 + height / 2, 0], i * 6);
    }
    axesGeom.setAttribute('position', new THREE.BufferAttribute(axesPos, 3));
    const axesMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: false, opacity: 1 });
    const axes = new THREE.LineSegments(axesGeom, axesMat);
    axes.name = 'parallelCoordsAxes';
    uiScene.add(axes);

    // Draw axis labels and min/max
    function makeTextSprite(message, parameters = {}) {
        const fontface = parameters.fontface || 'Arial';
        const fontsize = parameters.fontsize || 48;
        const borderThickness = parameters.borderThickness || 2;
        const borderColor = parameters.borderColor || { r: 0, g: 0, b: 0, a: 1.0 };
        const backgroundColor = parameters.backgroundColor || { r: 255, g: 255, b: 255, a: 0.0 };
        const textColor = parameters.textColor || { r: 255, g: 255, b: 255, a: 1.0 };

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = fontsize + "px " + fontface;
        // get size data (height depends only on font size)
        const metrics = context.measureText(message);
        const textWidth = metrics.width;

        // background color
        context.fillStyle = `rgba(${backgroundColor.r},${backgroundColor.g},${backgroundColor.b},${backgroundColor.a})`;
        context.fillRect(0, 0, textWidth + borderThickness * 2, fontsize + borderThickness * 2);

        // border color
        context.strokeStyle = `rgba(${borderColor.r},${borderColor.g},${borderColor.b},${borderColor.a})`;
        context.lineWidth = borderThickness;
        context.strokeRect(0, 0, textWidth + borderThickness * 2, fontsize + borderThickness * 2);

        // text color
        context.fillStyle = `rgba(${textColor.r},${textColor.g},${textColor.b},${textColor.a})`;
        context.fillText(message, borderThickness, fontsize + borderThickness / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(0.08, 0.04, 1);
        return sprite;
    }

    for (let i = 0; i < nAxes; ++i) {
        const x = x0 + (i / (nAxes - 1)) * width;
        // Axis name
        const label = makeTextSprite(axisNames[i], { fontsize: 90, textColor: { r: 255, g: 255, b: 255, a: 1 } });
        if (i === 0) {
            label.position.set(x + 0.02, y0 + height / 2 + 0.06, 0);
        }
        else if (i === 1) {
            label.position.set(x, y0 + height / 2 + 0.06, 0);
        }
        else if (i === 2) {
            label.position.set(x + 0.015, y0 + height / 2 + 0.06, 0);
        }
        else if (i === 3) {
            label.position.set(x + 0.015, y0 + height / 2 + 0.06, 0);
        }
        else if (i === 4) {
            label.position.set(x + 0.015, y0 + height / 2 + 0.06, 0);
        }

        label.name = `parallelCoordsLabel_${axisNames[i]}`;
        uiScene.add(label);

        let minvalue = minmax[i][0].toPrecision(3);
        if (i > 1) {
            minvalue = (minmax[i][0] - 5).toPrecision(2);
        }
        // Min value
        const minLabel = makeTextSprite(minvalue, { fontsize: 90, textColor: { r: 200, g: 200, b: 200, a: 1 } });
        minLabel.position.set(x, y0 - height / 2 - 0.03, 0);
        if (i < 4) {
            minLabel.position.set(x + 0.015, y0 - height / 2 - 0.03, 0);
        }
        minLabel.name = `parallelCoordsLabel_${axisNames[i]}_min`;
        uiScene.add(minLabel);

        let maxvalue = minmax[i][1].toPrecision(3);
        if (i > 1) {
            maxvalue = (minmax[i][1] - 5).toPrecision(2);
        }
        // Max value
        const maxLabel = makeTextSprite(maxvalue, { fontsize: 90, textColor: { r: 200, g: 200, b: 200, a: 1 } });
        maxLabel.position.set(x, y0 + height / 2 + 0.02, 0);
        if (i < 4) {
            maxLabel.position.set(x + 0.015, y0 + height / 2 + 0.02, 0);
        }
        maxLabel.name = `parallelCoordsLabel_${axisNames[i]}_max`;
        uiScene.add(maxLabel);
    }
}

function removeParallelCoordinatesPlot() {
    // Remove the lines
    const lines = uiScene.getObjectByName('parallelCoords');
    if (lines) uiScene.remove(lines);

    // Remove the axes
    const axes = uiScene.getObjectByName('parallelCoordsAxes');
    if (axes) uiScene.remove(axes);

    // Remove all axis labels (name starts with 'parallelCoordsLabel')
    const labels = uiScene.children.filter(obj => obj.name && obj.name.startsWith('parallelCoordsLabel'));
    for (const label of labels) {
        uiScene.remove(label);
    }
}

function updateParallelCoordinatesPlot() {
    if (parameters.showParallelCoords === true) {
        drawParallelCoordinatesPlot();
    } else {
        removeParallelCoordinatesPlot();
    }
}