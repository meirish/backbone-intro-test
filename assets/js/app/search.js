Lstn.Views.SearchView = Backbone.View.extend({
  
  el: '#search',

  // the view that will hold the results
  results: null, 
  
  events:{
    'keyup':'checkForEnter',
    'focus':'bindToReset',
    'blur':'unbindReset'
  },
  
  initialize: function(options){
    _.bindAll(this, 'suggestSearch');
    var throttleSugg = _.throttle( this.suggestSearch, 700 );
    $(this.el).keyup( throttleSugg );
  },
  
  checkForEnter: function(e){
    // if enter is pressed, submit the `val()`
    // to the search URL to get the results
    if (e.keyCode === 13){
      var query =  $(this.el).val();
      Lstn.router.navigate('search/'+ query, true);
    }
  },

  suggestSearch: function(e){
    var self = this,
        query = $(this.el).val();
      if (query.length > 2){
        Lstn.searchresult.fetch({data: {q:query}});
      }
      if(query.length === 0 && this.results){
        this.results.trigger('hide');
      }
  },
  
  refreshResults: function(){
    if (this.results){
      this.results.trigger('reset');
      if( $(this.results.el).is(':hidden') ){
        this.results.trigger('show');
      }
    } else {
      this.results = new Lstn.Views.SearchSuggestView;
      this.results.trigger('render');
    }
  },

  bindToReset: function(){
    Lstn.searchresult.bind('reset', this.refreshResults, this);
  },

  unbindReset: function(){
    Lstn.searchresult.unbind('reset');
  }

});

Lstn.Views.SearchSuggestView = Backbone.View.extend({

  className:'search-suggest',

  template: $('#search-suggest').html(),

  events: {
    'click .go-to-search':'goToSearch',
    'click a':'hide'
  },

  initialize: function(options){
    this.bind('reset', this.reset, this);
    this.bind('render', this.reset, this);
    this.bind('hide', this.hide, this);
    this.bind('show', this.show, this);
    this.render();
  },

  render: function(){
    $(this.el).html( this.template ).appendTo('body');
    return this;
  },

  reset: function(){
    var container = $(this.el).detach().empty();
    container.append($('<a href="#" class="go-to-search">See all search results</a>'));
    Lstn.searchresult.each(function(model){
      var view = new Lstn.Views.RdioObjView({ model: model, template:'#search-result' });
      container.append( $(view.el) );
    });
    container.appendTo('body');
  },

  goToSearch: function(e){
    e.preventDefault();
    var query =  $('#search').val();
    Lstn.router.navigate('search/'+ query, true);
  },

  hide: function(){
    $(this.el).fadeOut('fast', function(){ $(this).empty(); });
  }, 

  show: function(){
    $(this.el).fadeIn('fast');
  }


});

// subclass `Lstn.Views.SearcySuggestView` to override `template` and `render` 
Lstn.Views.SearchResultsView = Lstn.Views.SearchSuggestView.extend({

});

Lstn.Collections.SearchCollection = Backbone.Collection.extend({

  model: Lstn.Models.RdioObj,

  url: function(){
    if (this.type === 'suggest'){
      return '/suggest'
    } else {
      return '/find'
    }
  },

  initialize: function(){
    this.type = 'suggest'
  },

  setType: function( type ){
    //can be 'suggest' or 'search'
    if ( type && _.indexOf(['suggest','search'], type) !== -1 ){
      this.type = type;
    }
  }

});

// only going to use one
Lstn.searchresult = new Lstn.Collections.SearchCollection;
