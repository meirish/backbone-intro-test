Lstn.Models.PlayerModel = Backbone.Model.extend({

  initialize: function(options){
    if (options.lastPlayed){
      this.set({ lastPlayed:options.lastPlayed });
    }
    Lstn.player = new Lstn.Views.Player({ 
      el: '#player',
      model: this
    });
  }

})

// pass in an el
// new Lstn.Player({ el: $('someObj'});
Lstn.Views.Player = Backbone.View.extend({

  events: {
    'click .play' : 'play',
    'click .pause' : 'pause',
    'click .stop' : 'stop',
    'click .prev' : 'previous',
    'click .next' : 'next',
  },

  initialize: function(options) {
    var self = this;
    $.ajax({
      url:'/getPlaybackToken', 
      data: {domain: document.domain}, 
      dataType: 'text',
      success:function( data ) { 
      self.embedSwf(data);
      }
    });
    _.bindAll(this, 'ready', 'playingTrackChanged');
    this.bind('play', this.play, this);
    this.bind('pause', this.pause, this);
    this.model.bind('change:playingTrack', this.updatePlayingInfo, this);
  },

  show: function() {
    $(this.el).animate({'right':'0'}, 250);
  },

  embedSwf: function(playToken) {
    var flashvars,params;
    
    flashvars = {
      'playbackToken': playToken,
      'domain': document.domain,
      'listener': 'Lstn.player'
    };
    params = {
      'allowScriptAccess': 'always'
    };
    swfobject.embedSWF('http://www.rdio.com/api/swf/', 'rdioSwf', 1, 1, '9.0.0', 'expressInstall.swf', flashvars, params, {});
  },
  
  ready: function(){
    this.swf = $('#rdioSwf').get(0);
    this.show();
    //this.play({}, this.lastPlayed);
    //this.stop();
  },

  play: function(e, key){
    // if a string is passed as the first arg, then it's the key
    if ( e && _.isString(e) ){
      var key = e;
    }
    if ( key ) {
      this.swf.rdio_play( key );
    } else if( this.model.get('lastPlayed') ){
      // haven't played anything yet, so must be 
      // the first play, play the last thing they listened to
      this.swf.rdio_play( this.model.get('lastPlayed') );
      // remove this attr so it doesn't play this key again
      this.model.unset('lastPlayed');
    } else {
      // have played something before, so resume that
      this.swf.rdio_play();
    }
  },
  pause: function(e){
    this.swf.rdio_pause();
  },

  stop: function(){
    this.swf.rdio_stop();
  },

  previous: function(){
    this.swf.rdio_previous();
  },

  next: function(){
    this.swf.rdio_next();
  },

  updatePlayingInfo: function( model ){
    var markup,
        playingTrack = model.playingTrack,
        trackTemplate = $('#player-details').html(),
        defaultCntxt = {
          icon:'/img/default-player.png',
          name: '',
          album: '',
          artist: ''
        };

    if ( !playingTrack ) {
      markup = Mustache.to_html( trackTemplate, defalutContext );
    } else {
      markup = Mustache.to_html( trackTemplate, playingTrack );
    }

    this.$('.track').replaceWith(markup);
  },


// LISTENER METHODS for Rdio playback API
  playStateChanged: function( playState ){
//    The playback state has changed. 
//    The state can be: 0 → paused, 1 → playing, 2 → stopped, 3 → buffering or 4 → paused.
    switch (playState){
      case 1:
        this.$('.play-pause').removeClass('play').addClass('pause').text('Pause');
        break;
      case 3:
        this.$('.play-pause').removeClass('play').addClass('pause').text('Pause');
        break;
      default:
        this.$('.play-pause').removeClass('pause').addClass('play').text('Play');
        break;
    }
  },

  playingTrackChanged: function( playingTrack, sourcePosition ){
    this.model.playingTrack = playingTrack;
    this.model.set({ playingTrack: playingTrack.key });
  },

  playingSourceChanged: function (playingSource) {},

  volumeChanged : function (volume) {
    // The volume changed to volume, a number between 0 and 1.
  },

  muteChanged : function (mute) {
    // Mute was changed. mute will either be true (for muting enabled) or false (for muting disabled).
  },

  positionChanged : function (position) {
    //The position within the track changed to position seconds.
    // This happens both in response to a seek and during playback.
    $('#position').text(position);
  },

  queueChanged : function (newQueue) {
    // The queue has changed to newQueue.
  },

  shuffleChanged : function (shuffle) {
    // The shuffle mode has changed.
    // shuffle is a boolean, true for shuffle, false for normal playback order.
  },

  repeatChanged : function (repeatMode) {
    // The repeat mode change.
    // repeatMode will be one of: 0: no-repeat, 1: track-repeat or 2: whole-source-repeat.
  },

  playingSomewhereElse : function () {
    // An Rdio user can only play from one location at a time.
    // If playback begins somewhere else then playback will stop and this callback will be called.
  },

  updateFrequencyData : function (arrayAsString) {
    // Called with frequency information after this.swf.rdio_startFrequencyAnalyzer(options) is called.
    // arrayAsString is a list of comma separated floats.

    var arr = arrayAsString.split(',');

    $.each($('#freq div'), function(i) {
      $(this).css({'height':arr[i]*200, 'left':i*6});
    })
  }
});
