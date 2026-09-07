package expo.modules.studystuffstoredtheme

import android.app.UiModeManager
import android.content.Context
import android.os.Build
import androidx.appcompat.app.AppCompatDelegate
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

object StudyStuffStoredTheme {
  private const val preferencesName = "studystuff.theme"
  private const val modeKey = "mode"

  fun apply(context: Context) {
    val dark = preferences(context).getString(modeKey, "light") == "dark"

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val uiModeManager = context.getSystemService(UiModeManager::class.java)
      uiModeManager.setApplicationNightMode(
        if (dark) UiModeManager.MODE_NIGHT_YES else UiModeManager.MODE_NIGHT_NO
      )
    } else {
      AppCompatDelegate.setDefaultNightMode(
        if (dark) AppCompatDelegate.MODE_NIGHT_YES else AppCompatDelegate.MODE_NIGHT_NO
      )
    }
  }

  fun setMode(context: Context, mode: String) {
    preferences(context).edit().putString(modeKey, normalize(mode)).commit()
    apply(context)
  }

  private fun preferences(context: Context) =
    context.getSharedPreferences(preferencesName, Context.MODE_PRIVATE)

  private fun normalize(mode: String) = if (mode == "dark") "dark" else "light"
}

class StudyStuffStoredThemeModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("StudyStuffStoredTheme")

    Function("setMode") { mode: String ->
      StudyStuffStoredTheme.setMode(context, mode)
    }
  }
}
