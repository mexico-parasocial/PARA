// RN 0.81: `RCTSurfaceTouchHandler` ships in the React-RCTFabric pod, whose
// Clang module is C++-heavy and cannot be `import`ed from Swift. Pulling the
// single header in here instead exposes the class through this pod's own
// umbrella, which Swift can see.
//
// Upstream is on RN 0.86, where the class resolves without this. Delete this
// file (and the React-RCTFabric podspec dependency) when we catch up.
#import <React/RCTSurfaceTouchHandler.h>
