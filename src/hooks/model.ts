import {
  Cartesian3,
  Cesium3DTileset,
  HeadingPitchRoll,
  Transforms,
  Math,
  Color,
  NearFarScalar,
  Cartesian2,
  Cesium3DTileStyle,
  HeadingPitchRange,
  Viewer,
  defined,
  Cesium3DTileColorBlendMode
} from 'cesium';
export function useModel(viewer: Viewer) {
  async function addTitles(uri: string) {
    const tileSet = await Cesium3DTileset.fromUrl(uri, {
      skipLevelOfDetail: true,
      baseScreenSpaceError: 1024,
      skipScreenSpaceErrorFactor: 16,
      skipLevels: 1,
      immediatelyLoadDesiredLevelOfDetail: false,
      loadSiblings: false,
      cullWithChildrenBounds: true,
      maximumScreenSpaceError: 16
    });

    viewer.scene.primitives.add(tileSet);
    zoomCenter(tileSet);

    tileSet.colorBlendMode = Cesium3DTileColorBlendMode.REPLACE;
    tileSet.tileLoad.addEventListener((tile) => {
      const { content } = tile;
      processTileFeatures(content);
    });

    return tileSet;
  }

  // @ts-ignore
  function processContentFeatures(content) {
    const featuresLength = content.featuresLength;
    console.log(content);

    const feature = content.getFeature(0);
    const feature1 = content.getFeature(1);
    console.log(feature);
    console.log(feature1);
  }

  // @ts-ignore
  function processTileFeatures(content) {
    const { innerContents } = content;
    if (defined(innerContents)) {
      const length = innerContents.length;
      for (let i = 0; i < length; ++i) {
        processContentFeatures(innerContents[i]);
      }
    } else {
      processContentFeatures(content);
    }
  }

  function addGlb(
    name: string,
    uri: string,
    longitude: number,
    latitude: number,
    height: number,
    degrees: number
  ) {
    const position = Cartesian3.fromDegrees(longitude, latitude, height);
    const heading = Math.toRadians(degrees);
    const hpr = new HeadingPitchRoll(heading, 0, 0);
    const orientation = Transforms.headingPitchRollQuaternion(position, hpr);
    const glb = {
      name,
      position,
      orientation,
      model: {
        uri,
        minimumPixelSize: 128,
        maximumScale: 20000
      }
    };

    return glb;
  }

  /**
   * 放大到模型并居中显示
   * @param model
   */
  function zoomCenter(model: Cesium3DTileset) {
    viewer.zoomTo(
      model,
      new HeadingPitchRange(0.0, -0.5, model.boundingSphere.radius * 2.0)
    );
  }

  /**
   * 改变模型样式
   * @param model
   * @returns
   */
  function cssStyle(model: Cesium3DTileset, css: Object) {
    model.style = new Cesium3DTileStyle(css);
    return model;
  }

  return {
    zoomCenter,
    cssStyle,
    addTitles,
    addGlb
  };
}
