(function() {
  'use strict';

  function Game() {
    this.cannon = null;
    this.line = null;
  }

  Game.prototype = {

    create: function () {
      this.randSeed = 1;
      this.score = 0;
      this.style = { font: '16px Arial', fill: '#FFFFFF', align: 'center' };

      this.bg = this.add.sprite(0, 0, 'bg');
      this.bg.scale.set(0.5, 0.5);

      this.cursors = this.game.input.keyboard.createCursorKeys();

      this.target = { x: this.game.width * 1.1, y: this.game.height / 2 };

      this.earth = this.add.sprite(this.game.width * 1.35, this.game.height * 0.5, 'earth');
      this.earth.scale.set(0.6, 0.6);
      this.earth.anchor.setTo(0.5, 0.5);
      this.earth.r = (this.earth.width * 0.5) * 0.95;

      this.mocha = this.add.sprite(0, this.game.height * 0.5, 'mocha');
      this.mocha.anchor.setTo(0.5, 0.5);
      this.mocha.scale.set(0.2, 0.2);
      this.mocha.angle = 90;

      this.cannon = this.add.sprite(0, 0, 'cannon');
      this.cannon.position.x = this.mocha.height * 0.45;
      this.cannon.position.y = this.game.height * 0.5;
      this.cannon.scale.set(0.25, 0.25);
      this.cannon.anchor.set(0.5, 1.2);
      this.cannon.r = (this.cannon.width * 0.5);

      this.pinpoints = this.game.add.group();
      this.pums   = this.game.add.group();

      var numPins = 100;

      for(var i=0; i<numPins; i++){
        var pinpoint   = this.pinpoints.create(0, 0, 'pinpoint');
        pinpoint.angle = this.genPinPointAngle();
        var pum = this.pums.create(0, 0, 'pum');
      }

      this.pums.setAll('scale',    {x:0.3, y:0.3});
      this.pums.setAll('anchor',   {x: -8, y:  0});
      this.pums.setAll('visible',  false);

      this.earth.addChild(this.pinpoints);
      this.earth.addChild(this.pums);

      this.pinpoints.forEach(function(pin) {
        pin.x = this.earth.width * 0.8 * Math.cos(pin.angle * Math.PI / 180);
        pin.y = this.earth.width * 0.8 * Math.sin(pin.angle * Math.PI / 180);
      }, this)

      this.keyShoot = this.game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
      this.keyShoot.onDown.add(this.fire, this);

      this.lineProperties = this.add.bitmapData(this.game.width, this.game.height);
      this.lineProperties.ctx.beginPath();
      this.lineProperties.ctx.lineWidth = '2';
      this.lineProperties.ctx.setLineDash([2, 15]);
      this.lineProperties.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      this.lineProperties.ctx.stroke();

      this.line = this.add.sprite(0, 0, this.lineProperties);
      this.trajectoryLine();

      this.sounds = {
        soundtrack: this.game.add.audio('soundtrack', 0.1, true),
        actions: {
            fire       : this.game.add.audio('fire'),
            hit        : this.game.add.audio('hit'),
            earth_hit  : this.game.add.audio('earth_hit'),
            meteor_hit : this.game.add.audio('meteor_hit'),
            miss       : this.game.add.audio('miss')
        }
      };
      this.sounds.soundtrack.play();

      this.game.world.bringToTop(this.mocha);
      this.game.world.bringToTop(this.earth);

      this.textSprite = this.game.add.text(10, 10, 'SCORE: 0', this.style);


      this.game.time.events.loop(Phaser.Timer.SECOND,  this.maybeGenMeteor, this);
    },

    genPinPointAngle : function(){
        return Math.floor(Math.random()*(360-1)+1);
    },
    update: function () {
      if (!!this.coffeeCup && this.coffeeCup.exists) {
        this.steerCoffee();
      } else {
        this.steerCannon();
      }

      this.earth.angle = (this.game.time.now) * 0.00008 * (180 / Math.PI);
      this.trajectoryLine();
      this.movePlayer();
      this.checkCoffeeCollision();
      this.drawScore();
    },

    drawScore: function() {
      this.textSprite.text = 'SCORE: ' + this.score;
    },

    fire: function() {
      // only one coffee at a time
      if (!!this.coffeeCup && this.coffeeCup.exists) {
        return;
      }

      this.coffee = this.add.group();
      this.coffee.position.x = this.cannonTip().x;
      this.coffee.position.y = this.cannonTip().y;

      this.coffeeCup = this.coffee.create(0, 0, 'coffee');
      this.coffeeCup.checkWorldBounds = true;
      this.coffeeCup.anchor.set(0.5, 1);
      this.coffeeCup.scale.set(0.2, 0.2);

      this.coffeeFlame = this.coffee.create(0, 0, 'flames');
      this.coffeeFlame.anchor.set(0.5, 0);
      this.coffeeFlame.animations.add('walk');
      this.coffeeFlame.animations.play('walk', 10, true);
      this.coffeeFlame.scale.set(0.15, 0.15);

      this.coffee.rotation = Math.PI * 0.5;
      this.coffee.outOfBoundsKill = true;
      this.game.physics.enable(this.coffee, Phaser.Physics.ARCADE);

      var tween = this.game.add.tween(this.coffee).to({
        x: [this.cannonTip().x, this.game.width * 0.66, this.target.x, this.target.x],
        y: [this.cannonTip().y, this.target.y, this.target.y, this.target.y],
      }, 3000,Phaser.Linear , true).interpolation(function(v, k){
        return Phaser.Math.bezierInterpolation(v, k);
      });

      this.playFx(this.sounds.actions.fire);
      this.line.visible = false;
    },

    playFx: function(sound){
        sound.play();
    },

    trajectoryLine: function() {
      var maxHeight = this.target.y - this.earth.y / 2;

      this.lineProperties.clear();
      this.lineProperties.ctx.beginPath();
      this.lineProperties.ctx.moveTo(this.cannonTip().x, this.cannonTip().y);
      this.lineProperties.ctx.bezierCurveTo(
        this.game.width * 0.8, this.target.y, //controll 1
        this.target.x, this.target.y, // controll 2
        this.target.x, this.target.y
      );
      this.lineProperties.ctx.stroke();
      this.lineProperties.ctx.closePath();
      this.lineProperties.render();
    },

    cannonTip: function() {
      return {
        x: (this.cannon.world.x + Math.sin(this.cannon.angle * Math.PI/180) * this.cannon.height * 1.2),
        y: (this.cannon.world.y - Math.cos(this.cannon.angle * Math.PI/180) * this.cannon.width * 1.2)
      };
    },

    movePlayer: function() {
      var velocity = 6;
      var margin = 60;

      if (this.cursors.down.isDown) {
        if (this.target.y < this.earth.y + this.earth.height / 2 + margin)
          this.target.y += velocity;
      }

      if (this.cursors.up.isDown) {
        if (this.target.y > this.earth.y - this.earth.height / 2 - margin)
          this.target.y -= velocity;
      }
    },

    steerCannon: function() {
      var angle = Math.atan2(this.target.y - this.cannon.y, this.target.x - this.cannon.x );
      angle = angle * (180/Math.PI);

      if (angle < 0) {
        angle = 360 - (-angle);
      }

      this.cannon.angle = 90 + angle;
    },
    steerCoffee: function() {
    },
    maybeGenMeteor: function(){
        // Run every second, generate meteor prob% of the times
        var prob = 80;
        if(this.random(1,100) < prob){
            this.meteors = this.meteors || this.game.add.group();
            var from = {}; var to   = {};
            var rand = this.random(0,3);
            if(rand<1){
                from.x = -50;
                from.y = this.random(-2*this.game.height, this.game.height);
                to.x   = this.game.width+50;
                to.y   = this.random(-2*this.game.height, this.game.height);
            } else if(rand<2){
                from.x = this.game.width+50;
                from.y = this.random(-2*this.game.height, this.game.height);
                to.x   = -50;
                to.y   = this.random(-2*this.game.height, this.game.height);
            } else if(rand<3){
                from.x = this.random(-2*this.game.width, this.game.width);
                from.y = -50;
                to.x   = this.random(-2*this.game.width, this.game.width);
                to.y   = this.game.height+50;
            } else {
                from.x = this.random(-2*this.game.width, this.game.width);
                from.y = this.game.height+50;
                to.x   = this.random(-2*this.game.width, this.game.width);
                to.y   = -50;
            }

            var meteor = this.add.sprite(from.x, from.y, 'meteor');
            this.meteors.add(meteor);
            meteor.outOfBoundsKill = true;
            meteor.scale.set(0.1, 0.1);
            var tween  = this.game.add.tween(meteor).to(to,10000);
            tween.start();


            meteor.anchor.set();
            this.game.physics.enable(meteor, Phaser.Physics.ARCADE);
        }
    },
    random: function(min, max) {
        this.randSeed = this.randSeed+1;
        var seed = this.randSeed;

        var random = function() {
            var x = Math.sin(seed++) * 10000;
            return x - Math.floor(x);
        }
        var rand = Math.floor(random() * (max - min + 1)) + min;
        return rand;
    },
    checkCoffeeCollision: function() {
      if (!this.coffeeCup || !this.coffeeCup.exists) {
        return;
      }


      if (this.circlesOverlap(this.earth, this.coffeeCup)) {
        this.pinpoints.forEach(function(pin) {
          if (this.circlesOverlap(this.coffeeCup, pin)) {
            console.log('pin hit');
          }
        }, this);

        if (!this.coffee) { return; }
        this.score += 1;
        this.coffee.remove(this.coffeeCup);
        this.coffeeCup.kill();
        this.coffeeFlame.kill();
        this.line.visible = true;
        this.playFx(this.sounds.actions.earth_hit);
      }
    },

    circlesOverlap: function(circle1,circle2) {
      var distance = Math.sqrt(Math.pow(circle1.world.x - circle2.world.x, 2) + Math.pow(circle2.world.y - circle2.world.y, 2));
      return (distance < Math.max(circle1.r || circle1.width, circle2.r || circle2.width));
    }
  };

  window['chimera'] = window['chimera'] || {};
  window['chimera'].Game = Game;

}());
