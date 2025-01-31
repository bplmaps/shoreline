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
  import { toLonLat } from "ol/proj";
  import { apply } from "ol-mapbox-style";
  import "ol/ol.css";

  import shoreline from "../assets/shoreline.json";
  
  const key = "xzHYzv10Mfc1eJ8Vbizl";
  const styleJson = `https://api.maptiler.com/maps/topo-v2/style.json?key=${key}`;

  let mapElement;
  let map;

  let centerPoint = $state([-7910487.16649, 5215011.801042]);

  let distance = $derived( calculateDistanceToPolygon(centerPoint, shoreline.features.find(feature => feature.properties.year === selectedYear.year)))

  const possibleYears = [1630, 1795, 1852, 1880, 1916, 1934, 1950, 1995];

  let shorelineSource = new VectorSource({
    features: new GeoJSON().readFeatures(shoreline, {
      featureProjection: "EPSG:3857",
    }),
  });

  let filteredSource = new VectorSource({
    features: [shorelineSource.getFeatures().find(feature => feature.get("year") === selectedYear.year)],
  });

  let shorelineLayer = new VectorLayer({
    source: filteredSource,
    style: {
      "stroke-color": "rgba(82, 42, 17, 0.4)",
      "stroke-width": 3,
      "fill-color": "rgba(255,255,255,0.5)",
    },
  });

  let centerPointSource = new VectorSource();

  let centerPointLayer = new VectorLayer({
    source: centerPointSource,
    style: {
      'circle-radius': 9,
      'circle-fill-color': 'red'
    }
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
    constrainOnlyCenter: true
  });

  function updateCenterPoint() {
    const center = view.getCenter();
      centerPointSource.clear();
      centerPointSource.addFeatures([
        new Feature({ geometry: new Point(center) }),
      ]);

    centerPoint = toLonLat(center);
  }

  onMount(() => {
    map = new Map({
      target: mapElement,
      layers: [backgroundLayer, foregroundLayer],
      view: view,
    });

    apply(backgroundLayer, styleJson);
    updateCenterPoint();

    view.on("change", updateCenterPoint);

    return () => {
      if (map) {
        map.setTarget(null);
        map = null;
      }
    };
  });
</script>

<div class="w-screen h-screen">
  <div bind:this={mapElement} class="w-full h-full"></div>

  <div class="absolute top-5 right-10 flex justify-center">
    <Dropdown
      options={possibleYears}
    />
  </div>

  <div class="absolute bottom-5 left-10 flex justify-center bg-amber-950 text-white p-4 rounded-md">
    <p>The center of the map is {distance.toFixed(2)} km ({(distance*0.621371).toFixed(2) } miles) from the nearest point on the <strong>{selectedYear.year} shoreline.</strong></p>
  </div>
</div>

<style>
</style>
