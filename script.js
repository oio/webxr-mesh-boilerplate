import * as THREE from "three"
import { ARButton } from "./lib/ARButton.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"

import duckGLB from "url:./duck.glb"

let container
let camera, scene, renderer
let controller

let reticle

let hitTestSource = null
let hitTestSourceRequested = false

let duckMesh

// this utility function allows you to use any three.js
// loader with promises and async/await
const modelLoader = (url) => {
  const loader = new GLTFLoader()
  return new Promise((resolve, reject) => {
    loader.load(url, (data) => resolve(data), null, reject)
  })
}

const loadMesh = async (url) => {
  const gltf = await modelLoader(url)
  return gltf.scene.children[0]
}

const preloadMesh = async () => {
  duckMesh = await loadMesh(duckGLB)
}

const init = () => {
  container = document.createElement("div")
  document.body.appendChild(container)

  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    20
  )

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1)
  light.position.set(0.5, 1, 0.25)
  scene.add(light)

  //

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.xr.enabled = true
  container.appendChild(renderer.domElement)

  //

  document.body.appendChild(
    ARButton.createButton(renderer, { requiredFeatures: ["hit-test"] })
  )

  //

  const onSelect = () => {
    if (reticle.visible) {
      const mesh = duckMesh.clone()
      mesh.position.setFromMatrixPosition(reticle.matrix)
      scene.add(mesh)
    }
  }

  controller = renderer.xr.getController(0)
  controller.addEventListener("select", onSelect)
  scene.add(controller)

  reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial()
  )
  reticle.matrixAutoUpdate = false
  reticle.visible = false
  scene.add(reticle)

  //

  window.addEventListener("resize", onWindowResize)
}

const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  renderer.setSize(window.innerWidth, window.innerHeight)
}

//

const animate = () => {
  renderer.setAnimationLoop(render)
}

const render = (timestamp, frame) => {
  if (frame) {
    const referenceSpace = renderer.xr.getReferenceSpace()
    const session = renderer.xr.getSession()

    if (hitTestSourceRequested === false) {
      session.requestReferenceSpace("viewer").then(function (referenceSpace) {
        session
          .requestHitTestSource({ space: referenceSpace })
          .then(function (source) {
            hitTestSource = source
          })
      })

      session.addEventListener("end", function () {
        hitTestSourceRequested = false
        hitTestSource = null
      })

      hitTestSourceRequested = true
    }

    if (hitTestSource) {
      const hitTestResults = frame.getHitTestResults(hitTestSource)

      if (hitTestResults.length) {
        const hit = hitTestResults[0]

        reticle.visible = true
        reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix)
      } else {
        reticle.visible = false
      }
    }
  }

  renderer.render(scene, camera)
}

// 🏃‍♂️
preloadMesh()
init()
animate()
