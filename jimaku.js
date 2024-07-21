// Go to https://jimaku.cc/login and create a new account.
// Then go to https://jimaku.cc/account and click the `Generate` button to create a new API key
// Click the `Copy` button and paste it below
var API_KEY = 'YOUR_API_KEY_HERE';

// Keybindings
var MANUAL_SEARCH_KEY = 'g';
var AUTO_SEARCH_KEY = 'h';
var NEXT_PAGE_KEY = '0';
var PREV_PAGE_KEY = '9';
var CANCEL_KEY = 'c';

// Globals for internal use (do not change)
var PAGE_LENGTH = 8;
var options = [];
var step = 1;
var page = 0;
var selectedAnime = {};
var currentAnime = {};

function api(url, extraArgs) {
  var baseArgs = [
    'curl',
    '-s',
    '--url',
    url,
    '--header',
    'Authorization: ' + API_KEY,
  ];

  var args = Array.prototype.concat.apply(baseArgs, extraArgs);

  var res = mp.command_native({
    name: 'subprocess',
    playback_only: false,
    capture_stdout: true,
    capture_stderr: true,
    args: args,
  });

  if (res.stdout) return JSON.parse(res.stdout);
}

function downloadSub(sub) {
  return api(sub.url, ['--output', sub.name]);
}

function showMessage(message, persist) {
  var ass_start = mp.get_property_osd('osd-ass-cc/0');
  var ass_stop = mp.get_property_osd('osd-ass-cc/1');

  mp.osd_message(
    ass_start + '{\\fs16}' + message + ass_stop,
    persist ? 999 : 2
  );
}

// Taken from mpv-subversive
// https://github.com/nairyosangha/mpv-subversive/blob/master/backend/backend.lua#L146
function sanitize(text) {
  var subPatterns = [
    /\.[a-zA-Z]+$/, // extension
    /\./g,
    /-/g,
    /_/g,
    /\[[^\]]+\]/g, // [] bracket
    /\([^\)]+\)/g, // () bracket
    /720[pP]/g,
    /480[pP]/g,
    /1080[pP]/g,
    /[xX]26[45]/g,
    /[bB]lu[-]?[rR]ay/g,
    /^[\s]*/,
    /[\s]*$/,
    /1920x1080/g,
    /1920X1080/g,
    /Hi10P/g,
    /FLAC/g,
    /AAC/g,
  ];

  var result = text;

  subPatterns.forEach(function (subPattern) {
    var newResult = result.replace(subPattern, ' ');
    if (newResult.length > 0) {
      result = newResult;
    }
  });

  return result;
}

// Taken from mpv-subversive
// https://github.com/nairyosangha/mpv-subversive/blob/master/backend/backend.lua#L164
function extractTitleAndNumber(text) {
  var matchers = [
    { regex: /^([\w\s\d]+)[Ss](\d+)[Ee]?(\d+)/, groups: [1, 2] },
    { regex: /^([\w\s\d]+)-[\s]*(\d+)[\s]*[^\w]*$/, groups: [1, 2] },
    { regex: /^([\w\s\d]+)[Ee]?[Pp]?[\s]+(\d+)$/, groups: [1, 2] },
    { regex: /^([\w\s\d]+)[\s](\d+).*$/, groups: [1, 2] },
    { regex: /^(\d+)[\s]*(.+)$/, groups: [2, 1] },
  ];

  for (var i = 0; i < matchers.length; i++) {
    var matcher = matchers[i];
    var match = text.match(matcher.regex);
    if (match) {
      var title = match[matcher.groups[0]].trim();
      var episode = parseInt(match[matcher.groups[1]], 10);
      return { title: title, episode: episode };
    }
  }

  return { title: text, episode: null };
}

function showResults(results) {
  var message = 'Results:\n';

  dump(results);
  options = [];

  if (results.error) {
    showMessage('Error: ' + results.error);
    return;
  }

  if (results.length === 0) {
    showMessage('No results found');
    if (currentAnime.title) {
      mp.input.get({
        prompt: 'Search term: ',
        submit: search,
        default_text: currentAnime.title,
      });
      currentAnime = {};
    }
    return;
  }
  var trueIndex = page * PAGE_LENGTH;
  var j = 0;

  for (var i = trueIndex; i < trueIndex + PAGE_LENGTH; i++) {
    if (results[i]) {
      var item = j + 1;
      message += '[' + item + ']' + ' - ' + results[i].name + '\n';
      options.push(results[i]);

      mp.add_key_binding(
        item,
        'jimaku-' + item,
        step === 1 ? onSelectAnime : selectSub,
        {
          complex: true,
        }
      );
    }
    j++;
  }

  message += '\n';

  if (page > 0) {
    mp.add_key_binding(PREV_PAGE_KEY, 'jimaku-' + PREV_PAGE_KEY, function () {
      clearOptions();
      page--;
      showResults(results);
    });
    message += '\n[' + PREV_PAGE_KEY + '] - Prev page';
  } else {
    mp.remove_key_binding('jimaku-' + PREV_PAGE_KEY);
  }

  if (results.length > page * PAGE_LENGTH + options.length) {
    mp.add_key_binding(NEXT_PAGE_KEY, 'jimaku-' + NEXT_PAGE_KEY, function () {
      clearOptions();
      page++;
      showResults(results);
    });
    message += '\n[' + NEXT_PAGE_KEY + '] - Next page';
  } else {
    mp.remove_key_binding('jimaku-' + NEXT_PAGE_KEY);
  }

  message += '\n[' + CANCEL_KEY + '] - Cancel';
  mp.add_key_binding(CANCEL_KEY, 'jimaku-' + CANCEL_KEY, cancel);

  showMessage(message, true);
}

function selectEpisode(episode) {
  mp.input.terminate();

  var res;

  if (episode) {
    showMessage(
      'Fetching subs for: ' + selectedAnime.name + ' episode ' + episode
    );
    res = api(
      'https://jimaku.cc/api/entries/' +
        selectedAnime.id +
        '/files?episode=' +
        episode
    );
  } else {
    showMessage('Fetching all subs for: ' + selectedAnime.name);
    res = api('https://jimaku.cc/api/entries/' + selectedAnime.id + '/files');
  }

  step = 2;
  showResults(res);
}

function onSelectAnime(event) {
  selectedAnime = {};

  if (event.event === 'up') {
    selectAnime(options[event.key_name - 1]);
  }
}

function selectAnime(anime) {
  page = 0;
  selectedAnime = anime;
  showMessage(selectedAnime.name + '\n\nEpisode: ', true);
  clearOptions();
  if (currentAnime.episode) {
    selectEpisode(currentAnime.episode);
  } else {
    mp.input.get({
      prompt: 'Episode (leave blank for all): ',
      submit: selectEpisode,
    });
  }
}

function selectSub(event) {
  if (event.event === 'up') {
    page = 0;
    var selectedSub = options[event.key_name - 1];
    showMessage('Downloading: ' + selectedSub.name, true);
    clearOptions();
    downloadSub(selectedSub);

    showMessage(selectedSub.name + ' downloaded');

    mp.commandv('sub_add', selectedSub.name);
    showMessage(selectedSub.name + ' added');
    mp.set_property('pause', 'no');
  }
}

function clearOptions() {
  mp.remove_key_binding('jimaku-' + CANCEL_KEY);
  mp.remove_key_binding('jimaku-' + PREV_PAGE_KEY);
  mp.remove_key_binding('jimaku-' + NEXT_PAGE_KEY);
  for (var i = 0; i < options.length; i++) {
    mp.remove_key_binding('jimaku-' + (i + 1));
  }
}

function cancel() {
  clearOptions();
  page = 0;
  currentAnime = {};
  step = 1;
  showMessage('');
}

function search(searchTerm) {
  mp.input.terminate();
  step = 1;

  showMessage('Searching for: "' + searchTerm + '"', true);

  var res = api(
    encodeURI(
      'https://jimaku.cc/api/entries/search?anime=true&query=' + searchTerm
    )
  );

  dump(res.length);

  if (res.length === 1) {
    selectAnime(res[0]);
    return;
  }

  showResults(res);
}

function manualSearch() {
  showMessage('Manual Jimaku Search', true);
  mp.set_property('pause', 'yes');
  mp.input.get({ prompt: 'Search term: ', submit: search });
}

function autoSearch() {
  mp.set_property('pause', 'yes');
  currentAnime = {};
  showMessage('Auto Jimaku Search');
  var filename = mp.get_property('filename');
  var sanitizedFilename = sanitize(filename);
  currentAnime = extractTitleAndNumber(sanitizedFilename);

  search(currentAnime.title);
}

mp.add_key_binding(MANUAL_SEARCH_KEY, 'jimaku-manual-search', manualSearch);
mp.add_key_binding(AUTO_SEARCH_KEY, 'jimaku-auto-search', autoSearch);