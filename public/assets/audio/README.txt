SAS Engineering Hub — Original SCADA alarm sounds

critical_alarm: urgent repeating triple pulse (trip/protection)
major_alarm: repeating double beep (IED offline/communication failure)
minor_alarm: slow single beep (warning)
alarm_acknowledged: short confirmation tone
alarm_cleared: ascending three-tone resolution

Both WAV and MP3 formats included. These are synthesized original sounds, not recordings of a particular vendor HMI.

Usage: copy MP3 files into public/assets/audio/ and use e.g. /assets/audio/critical_alarm.mp3 in the React app. Play sounds only on an appropriate alarm event, with a user mute/volume control and an acknowledgement option. Browsers may block autoplay until user interaction.
