Lstn.Models.RdioObj = Backbone.Model.extend({
  
  urlRoot: '/get',

  initialize: function(options){
    // use the `key` from the response as the `id`
    this.set({ 'id': options.key });
    // store `type` directly on the model for convenience
    if (options && options.type){
      this.type = options.type;
    }
    // make sure type is set on the model when set outside 
    // of instantiation (i.e. from a fetch() call )
    this.bind('change:type', function(model){ 
      model.type = model.get('type');
    });
  },

  canPlay: function(){
    // if it's a track, playlist, album, or collection album
    // you can play it
    return ( _.indexOf(['t','p','a','al'], this.type) !== -1) ? true : false;
  },

  getPermalink: function(){
    var slugs = {
      'a':'albums',
      's':'users',
      'r':'artists',
      'l':'labels',
      'p':'playlists'
    }
    return '#'+slugs[this.type] + '/' + this.id;
  }

});

Lstn.Collections.RdioObjCollection = Backbone.Collection.extend({
  // default to the page section for appending model views 
  appendTo: '#page',

  model: Lstn.Models.RdioObj,
  
  initialize: function(models, options){
  // if `appendTo` is specified
    if(options && options.appendTo){
      this.appendTo = options.appendTo;
    }
    this.bind('renderAll', this.renderAll, this);
  },

  renderAll: function(){
    var container,
        elToAppendTo = $(this.appendTo);

    if ( !elToAppendTo.length ){
    // if the container doesn't exist, create it
      container = $('<div id="'+this.appendTo+'"></div>');
    } else {
    // if it does, detach it so `append()` doesn't incur perf penalties
      container = elToAppendTo.detach();
    }
    // loop over the models creating a view with each and appending
    // it to the container
    this.each(function(model){
      var view = new Lstn.Views.RdioObjView({model: model});
      $(view.el).appendTo( container );
    });
    // attach the container back to the page
    container.appendTo('body');
  }

});

Lstn.Collections.HeavyRotation = Lstn.Collections.RdioObjCollection.extend({
  
  url:'/getHeavyRotation'

});


Lstn.Views.RdioObjView = Backbone.View.extend({
  
  className: 'rdio-obj',

  events: {
    'click .play':'play'
  },

  template: $('#rdio-obj').html(),

  initialize: function(options){
    // if a template was passed in, use it instead of the default
    if (options.template){
      this.template = $(options.template).html();
    }
    // add the type to the class so we can style them differently
    this.className += ' '+this.model.type;
    // call `render()`
    this.render();
    // bind model `change` event to render so the view 
    // $(will update with the model
    this.model.bind('change', this.render, this);

  },

  render: function(){
    var context, rendered;

    // create JSON obj from `model.attributes`
    context = this.model.toJSON();
    // add a boolean to the context based on type
    context.canPlay = this.model.canPlay();
    // get a link to the route for the object
    context.permalink = this.model.getPermalink();
    // munge the template with the context
    rendered = Mustache.to_html(this.template, context);
    // add the className and insert the rendered template to the `el` 
    $(this.el).addClass( this.className ).html( rendered );
    return this;
  },

  play: function(e){
    var key;
    // if you can play this obj, pass it's key to the player
    if ( this.model.canPlay() ){
      key = this.model.id;
    } else {
      key = $(e.target).data('key');
    }

      Lstn.player.trigger('play', key);
  }

});
