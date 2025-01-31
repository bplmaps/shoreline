<script>
  import { onMount } from "svelte";
  import Dropdown from "./Dropdown.svelte";

  import { selectedYear } from "./state.svelte.js";
  import { calculateDistanceToPolygon } from "./distanceCalculator.js";

  import Map from "ol/Map";
  import View from "ol/View";
  import VectorLayer from "ol/layer/Vector";
  import VectorSource from "ol/source/Vector";
  import LayerGroup from "ol/layer/Group";
  import GeoJSON from "ol/format/GeoJSON";
  import Point from "ol/geom/Point";
  import Feature from "ol/Feature";
  import { toLonLat, fromLonLat } from "ol/proj";
  import { apply } from "ol-mapbox-style";
  import "ol/ol.css";

  import shoreline from "../assets/shoreline.json";

  const key = "xzHYzv10Mfc1eJ8Vbizl";
  const styleJson = `https://api.maptiler.com/maps/topo-v2/style.json?key=${key}`;

  let mapElement;
  let map;

  let measureOn = $state(false);

  const possibleYears = shoreline.features.map(
    (feature) => feature.properties.year,
  );

  let centerPoint = $state([0, 0]);
  let distance = $derived(
    calculateDistanceToPolygon(
      centerPoint,
      shoreline.features.find(
        (feature) => feature.properties.year === selectedYear.year,
      ),
    ),
  );

  let shorelineSource = new VectorSource({
    features: new GeoJSON().readFeatures(shoreline, {
      featureProjection: "EPSG:3857",
    }),
  });

  let filteredSource = new VectorSource({
    features: [
      shorelineSource
        .getFeatures()
        .find((feature) => feature.get("year") === selectedYear.year),
    ],
  });

  let shorelineLayer = new VectorLayer({
    source: filteredSource,
    style: {
      "stroke-color": "rgba(82, 42, 17, 0.4)",
      "stroke-width": 3,
      "fill-color": "rgba(108, 134, 224, 0.4)",
    },
  });

  let centerPointSource = new VectorSource();

  let centerPointLayer = new VectorLayer({
    source: centerPointSource,
    style: {
      "circle-radius": 9,
      "circle-fill-color": "red",
    },
  });

  let backgroundLayer = new LayerGroup();
  let foregroundLayer = new LayerGroup({
    layers: [shorelineLayer, centerPointLayer],
  });

  $effect(() => {
    const y = selectedYear.year;

    if (!map) return;
    const features = shorelineSource.getFeatures();
    filteredSource.clear();
    filteredSource.addFeatures(
      features.filter((feature) => feature.get("year") === y),
    );
  });

  let view = new View({
    center: [-7910487.16649, 5215011.801042],
    zoom: 15,
    extent: shorelineSource.getExtent(),
    constrainOnlyCenter: true,
  });

  function updateMeasurePoint(point) {
    centerPointSource.clear();
    centerPointSource.addFeatures([
      new Feature({ geometry: new Point(point) }),
    ]);

    centerPoint = toLonLat(point);
  }

  function handleMouseMove(event) {
    if (!map || !measureOn) return;

    const coords = map.getCoordinateFromPixel([event.x, event.y]);
    updateMeasurePoint(coords);
  }

  function getLocation() {
    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = fromLonLat([
          position.coords.longitude,
          position.coords.latitude,
        ]);
        view.setCenter(coords);
      },
      (error) => {
        console.error("Error getting location:", error.message);
        window.alert("We couldn't find your location. Please try again.");
      },
    );
  }

  onMount(() => {
    map = new Map({
      target: mapElement,
      layers: [backgroundLayer, foregroundLayer],
      view: view,
    });

    apply(backgroundLayer, styleJson);

    return () => {
      if (map) {
        map.setTarget(null);
        map = null;
      }
    };
  });
</script>

<div class="w-screen h-screen">
  <div
    bind:this={mapElement}
    class="w-full h-full"
    onmousemove={handleMouseMove}
  ></div>

  <div class="absolute bottom-5 left-5 w-1/2 bg-white rounded-md p-4">
    <div class="flex flex-col md:flex-row">
      <Dropdown options={possibleYears} />
      <div>
        <button
          onclick={() => (measureOn = !measureOn)}
          class={`relative w-full cursor-pointer rounded-md py-2 pl-3 pr-10 text-left shadow-sm ring-1 ring-inset focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm md:text-2xl sm:leading-6 ${
            measureOn
              ? "bg-red-500 text-white ring-red-300"
              : "bg-white text-gray-900 ring-gray-300"
          }`}
        >
          {measureOn ? "Stop Measuring" : "Start Measuring"}
        </button>
      </div>
      {#if measureOn}
      <div class="ml-4 flex-shrink">
        <p>
          The red point is {distance.toFixed(2)} km ({(
            distance * 0.621371
          ).toFixed(2)} miles) from the nearest point on the
          <strong>{selectedYear.year} shoreline.</strong>
        </p>
      </div>
      {/if}
      <div class="flex-grow">
        <button
          onclick={getLocation}
          class="relative w-full cursor-pointer rounded-md bg-white py-2 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm md:text-2xl sm:leading-6"
        >
          Find my location
        </button>
      </div>
    </div>
  </div>
</div>

<style>
</style>
