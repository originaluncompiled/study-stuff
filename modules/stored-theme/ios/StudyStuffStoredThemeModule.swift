import ExpoModulesCore
import UIKit

public class StudyStuffStoredThemeModule: Module {
  private static let modeKey = "studystuff.theme.mode"

  public func definition() -> ModuleDefinition {
    Name("StudyStuffStoredTheme")

    Function("setMode") { (mode: String) in
      let storedMode = mode == "dark" ? "dark" : "light"
      UserDefaults.standard.set(storedMode, forKey: Self.modeKey)

      DispatchQueue.main.async {
        let style: UIUserInterfaceStyle = storedMode == "dark" ? .dark : .light
        UIApplication.shared.connectedScenes
          .compactMap { $0 as? UIWindowScene }
          .flatMap(\.windows)
          .forEach { $0.overrideUserInterfaceStyle = style }
      }
    }
  }
}
