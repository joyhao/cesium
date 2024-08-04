import { Cartesian3, HeadingPitchRoll, Viewer } from 'cesium';

export function useCamera() {
  function setView(viewer: Viewer) {
    // viewer.scene.camera.setView({
    //   destination: new Cartesian3(
    //     4401744.644145314,
    //     225051.41078911052,
    //     4595420.374784433
    //   ),
    //   orientation: new HeadingPitchRoll(
    //     5.646733805039757,
    //     -0.276607153839886,
    //     6.281110875400085
    //   )
    // });
  }

  return {
    setView
  };
}
