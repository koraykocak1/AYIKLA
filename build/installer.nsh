; Kaldırırken sorulur: programın kendi küçük resimleri ve kayıtları (%USERPROFILE%\.ayikla) da silinsin mi?
; Fotoğraflara ve kaydedilen klasörlere dokunulmaz. Güncellemede hiç sorulmaz, hiçbir şey silinmez.
!macro customUnInstall
  ${ifNot} ${isUpdated}
    MessageBox MB_YESNO|MB_ICONQUESTION "AYIKLA'nın küçük resimleri ve kayıtları da silinsin mi?$\r$\n$\r$\nFotoğrafların ve kaydettiğin klasörler silinmez." /SD IDNO IDNO ayikla_atla
      RMDir /r "$PROFILE\.ayikla"
    ayikla_atla:
  ${endIf}
!macroend
