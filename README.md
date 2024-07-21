# mpv-jimaku
**Simple [mpv](https://mpv.io/) script to download subs from [Jimaku](https://jimaku.cc/).**

https://github.com/user-attachments/assets/135bfe6d-6e35-48bf-9da9-98e7fbbde893

Inspired by [mpv-subversive](https://github.com/nairyosangha/mpv-subversive) - if you have the means please use that instead, it has alot more features and is just better all round.
This script is simply a stripped down and easier to install imitation of `mpv-subversive`.

### Installation
1. Download the latest version of the script from the [releases section](https://github.com/ZXY101/mpv-jimaku/releases/) and add it to your [scripts folder](https://mpv.io/manual/master/#script-location).
2. If you haven't already, create an account on [Jimaku](https://jimaku.cc/login).
3. Go to the [account page](https://jimaku.cc/account) and click the `Generate` button to create a new API key.
4. Copy the API key and replace `YOUR_API_KEY_GOES_HERE` in the script with your API key.

### Limitations
- The script relies on `curl` to make the requests, it should be pre-installed on most devices but if the script does not work make sure you have [curl](https://curl.se/) installed.
- The manual search makes use of mpv's new `mp.input()` feature, which means you will need to be on mpv [v0.38.0](https://github.com/mpv-player/mpv/releases/tag/v0.38.0).
- The script does not currently handle archives, it will still download them but not automatically unzip them or update the sub track.

### Acknowledgments
- https://github.com/nairyosangha/mpv-subversive
