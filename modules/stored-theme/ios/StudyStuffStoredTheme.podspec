Pod::Spec.new do |s|
  s.name             = 'StudyStuffStoredTheme'
  s.version          = '1.0.0'
  s.summary          = 'Persists the explicit StudyStuff appearance for native launch.'
  s.description      = s.summary
  s.license          = { :type => 'MIT' }
  s.author           = 'StudyStuff'
  s.homepage         = 'https://github.com'
  s.platforms        = { :ios => '16.4' }
  s.swift_version    = '5.9'
  s.source           = { :path => '.' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.{h,m,swift}'
end
