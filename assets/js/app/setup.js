
//global namespace
var Lstn = {
  Views: {},
  Collections: {},
  Models: {},
  Routers: {},
  init: function(options){
    if(options && options.lastPlayed){
      var lastPlayed = options.lastPlayed;
    }
    // are both singletons
    new Lstn.Models.PlayerModel({lastPlayed:lastPlayed});
    new Lstn.Views.SearchView;
    Lstn.heavyRotation = new Lstn.Collections.HeavyRotation;

    Lstn.router = new Lstn.Routers.RdioRouter;
    Backbone.history.start();
  }
}

Lstn.Routers.RdioRouter = Backbone.Router.extend({

  pageTemplate: $('#page'),

  routes:{
    '':'index',
    'albums/:id':'detailView',
    'users/:id':'detailView',
    'tracks/:id':'detailView',
    'artists/:id':'detailView',
    'labels/:id':'detailView',
    'playlists/:id':'detailView',
    'search/:query':'search'
  }, 

  index: function(){
    this.pageTemplate.empty();
    // if there's bootstraped JSON
    if( Lstn.bootstrap ){
    // create an `Lstn.Collections.RdioObjCollection` w/ the heavy rotation
      Lstn.heavyRotation.reset(Lstn.bootstrap);
      Lstn.heavyRotation.trigger('renderAll');
    // clean up reference
      delete Lstn.bootstrap
    } else {
    // otherwise get it fresh and then render all
      Lstn.heavyRotation.fetch({
        success:function(collection, response){
          collection.renderAll();
        }
      });
    }
  },

  detailView: function(id){
    var model, view, self = this;
    // remove page template from DOM and empty it
    this.pageTemplate.detach().empty();

    // function to render a view given a model
    function renderTemplate(model){
      // create the view with the #obj-detail
      view = new Lstn.Views.RdioObjView({
                  model: model,
                  template: '#obj-detail'
              });
      // add rendered view to the page template
      $(view.el).appendTo(self.pageTemplate);
      // add page template back to the DOM
      self.pageTemplate.appendTo('body');
    }
    // model could be in existing collections
    model = Lstn.heavyRotation.get(id) ||  Lstn.searchresult.get(id) || 
          // if not we ned to create it
          new Lstn.Models.RdioObj({key: id});
    // if the model doesn't have a `type` attribute you know it didn't
    // come from the server so we have to fetch it then render it
    if (!model.has('type')) {
      model.fetch({success: renderTemplate });
    } else {
    // otherwise we just have to render it
      renderTemplate( model ); 
    }
    console.log(model);
  },

  search: function(query){
    var self = this;
    // set the type which will give us a different URL
    Lstn.searchresult.setType( 'search' );
    Lstn.searchresult.fetch({
      data: {q:query},
      success: function(collection, response){
        collection.reset(response.results);
        // detach and remove the #page element
        var container = self.pageTemplate.detach().empty();
        // iterate over the models, creating and appending a view for each of them
        collection.each(function(model){
          var view = new Lstn.Views.RdioObjView({ model: model });
          container.append( $(view.el) );
        });
        container.appendTo('body');
      },
      error: function(collection, response){ 
        alert('something broke');
      }
    });
    // set the type back to 'suggest'
    Lstn.searchresult.setType( 'suggest' );
  }

});
