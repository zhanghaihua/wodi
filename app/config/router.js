/**
 * sumeru F / W
 * Copyright
 * License
 */

/**
 * route config
 * 
 */
sumeru.router.add(
  	{
	    pattern:'',
	    action : 'App.gameHost'
	},
	{
	    pattern:'/host',
	    action : 'App.gameHost'
	},
	{
	    pattern:'/game',
	    action : 'App.gameDesk'
	}
);

