; KPower Monitor - all-in-one Windows installer (UI + HID bridge + Node runtime)

#define MyAppName "KPower Monitor"
#define MyAppVersion "0.1.0"
#define MyAppPublisher "KPower"
#define MyAppURL "https://github.com/HasanR3/kpower"
#define MyAppExeName "Start-KPower.cmd"

[Setup]
AppId={{A8F3C2E1-9B4D-4F71-9E2A-6C1D0B8A4E27}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
DefaultDirName={autopf}\KPower
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=..\release
OutputBaseFilename=KPower-Setup-{#MyAppVersion}
SetupIconFile=..\src-tauri\icons\icon.ico
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayIcon={app}\icons\icon.ico
; Info for users hitting Smart App Control on unsigned builds
InfoBeforeFile=info-before.txt

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Additional icons:"; Flags: unchecked
Name: "hidservice"; Description: "Install HID bridge as a background scheduled task"; GroupDescription: "Background monitoring:"

[Files]
Source: "staging\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\scripts\{#MyAppExeName}"; WorkingDir: "{app}"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\scripts\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
Filename: "{app}\scripts\{#MyAppExeName}"; Description: "Launch {#MyAppName}"; Flags: nowait postinstall skipifsilent shellexec
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\scripts\install-hid-service.ps1"""; StatusMsg: "Installing HID scheduled task..."; Tasks: hidservice; Flags: runhidden waituntilterminated

[UninstallRun]
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\scripts\uninstall-hid-service.ps1"""; RunOnceId: "UninstallHidService"; Flags: runhidden waituntilterminated
