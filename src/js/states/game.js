(function() {
  'use strict';

  function Game() {
  }

  Game.prototype = {
    create: function () {
      this.randSeed = 1;
      this.score = 0;
      this.style = { font: '16px Arial', fill: '#FFFFFF', align: 'center' };

      this.bg = this.add.sprite(0, 0, 'bg');
      this.bg.scale.set(0.5, 0.5);

      this.cursors = this.game.input.keyboard.createCursorKeys();
      this.game.input.mouse.mouseWheelCallback = this.mouseMovePlayer.bind(this);

      this.target = { x: this.game.width * 1.1, y: this.game.height / 2 };

      this.earth = this.add.sprite(this.game.width * 1.72, this.game.height * 0.5, 'earth');
      this.earth.anchor.setTo(0.5, 0.5);
      this.earth.r = (this.earth.width * 0.5);
      // this.earth.scale.set(0.8, 0.6);

      this.mocha = this.add.sprite(0, this.game.height * 0.5, 'mocha');
      this.mocha.anchor.setTo(0.5, 0.5);
      this.mocha.angle = 90;

      this.cannon = this.add.sprite(0, 0, 'cannon');
      this.cannon.position.x = this.mocha.height * 0.45;
      this.cannon.position.y = this.game.height * 0.5;
      this.cannon.scale.set(0.25, 0.25);
      this.cannon.anchor.set(0.5, 1.2);
      this.cannon.r = (this.cannon.width * 0.5);

      this.pinpoints = this.game.add.group();
      this.pums      = this.game.add.group();

      var numPins = 20;

      for(var i=0; i<numPins; i++){ this.newPin(); }

      this.earth.addChild(this.pinpoints);
      this.earth.addChild(this.pums);

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
            junk_hit   : this.game.add.audio('junk_hit'),
            miss       : this.game.add.audio('miss')
        }
      };
      this.sounds.soundtrack.play();

      this.game.world.bringToTop(this.mocha);
      this.game.world.bringToTop(this.earth);

      this.textSprite = this.game.add.text(10, 10, 'SCORE: 0', this.style);


      this.game.time.events.loop(Phaser.Timer.SECOND,  this.maybeGenJunk, this);
    },

    genPinPointAngle : function(){
        return Math.floor(Math.random()*(360-1)+1);
    },
    update: function () {
      if (!!this.coffee && this.coffee.exists) {
        this.steerCoffee();
      } else {
        this.steerCannon();
      }

      this.earth.angle = (this.game.time.now) * 0.00008 * (180 / Math.PI);
      this.trajectoryLine();
      this.movePlayer();
      this.checkCoffeeCollision();
      this.updateCoffeeSpeed();
      this.drawScore();
    },

    drawScore: function() {
      this.textSprite.text = 'SCORE: ' + this.score;
    },

    fire: function() {
      // only one coffee at a time
      if (!!this.coffee && this.coffee.exists) {
        return;
      }

      this.coffee = this.add.sprite(this.cannonTip().x, this.cannonTip().y, 'coffee');

      this.coffee.checkWorldBounds = true;
      this.coffee.anchor.set(0.5, 0.5);
      this.coffee.scale.set(0.2, 0.2);
      this.coffee.hit = false;
      this.game.physics.arcade.enable(this.coffee);

      this.coffeeFlame = this.add.sprite(0, 0, 'flames');
      this.coffee.addChild(this.coffeeFlame);
      this.coffeeFlame.anchor.set(1.3, 0.5);
      this.coffeeFlame.animations.add('walk');
      this.coffeeFlame.animations.play('walk', 10, true);
      this.coffee.outOfBoundsKill = true;

      this.coffee.angle = this.cannon.angle - 90;
      this.updateCoffeeSpeed();
      this.playFx(this.sounds.actions.fire);
      this.line.visible = false;
    },

    updateCoffeeSpeed: function() {
      if (!this.coffee) {
        return;
      }

      var linearVelocity = 300;

      this.coffee.body.velocity.x = linearVelocity * Math.cos(this.coffee.angle * Math.PI / 180);
      this.coffee.body.velocity.y = linearVelocity * Math.sin(this.coffee.angle * Math.PI / 180);
    },

    playFx: function(sound){
        sound.play();
    },

    trajectoryLine: function() {
      this.lineProperties.clear();
      this.lineProperties.ctx.beginPath();
      this.lineProperties.ctx.moveTo(this.cannonTip().x, this.cannonTip().y);
      this.lineProperties.ctx.lineTo(this.target.x, this.target.y);
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
        if (this.target.y < this.earth.y + this.earth.height / 2 + margin) {
          this.target.y += velocity;
        }
      }

      if (this.cursors.up.isDown) {
        if (this.target.y > this.earth.y - this.earth.height / 2 - margin) {
          this.target.y -= velocity;
        }
      }

    },

    mouseMovePlayer: function(){
      var velocity = 20;
      var margin = 60;

      if(this.game.input.mouse.wheelDelta === Phaser.Mouse.WHEEL_UP){
        if (this.target.y < this.earth.y + this.earth.height / 2 + margin) {
          this.target.y -= velocity;
        }
      } else {
        if (this.target.y > this.earth.y - this.earth.height / 2 - margin) {
          this.target.y += velocity;
        }
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
      var angularVelocity = 0.5;

      if (this.cursors.down.isDown) {
        this.coffee.angle += angularVelocity;
        this.coffee.lastSteeredAt = Date.now();
      }

      if (this.cursors.up.isDown) {
        this.coffee.angle -= angularVelocity;
        this.coffee.lastSteeredAt = Date.now();
      }

      this.updateCoffeeSpeed();
    },
    maybeGenJunk: function(){
        // Run every second, generate junk prob% of the times
        var prob = 80;
        if(this.random(1,100) < prob){
            this.junks = this.junks || this.game.add.group();
            var from = {}; var to   = {};
            var rand = this.random(0,1);

            from.x = this.random(this.game.width * 0.2, this.game.width * 0.8);
            to.x   = this.random(this.game.width * 0.2, this.game.width * 0.8);

            if(rand==0){
              from.y = -50;
              to.y   = this.game.height+50;
            } else if(rand==1){
              from.y = this.game.height+50;
              to.y   = -50;
            }

            var junk;
            var prob = this.random(1,10);
            // Meteor
            if(prob < 8){
                junk = this.add.sprite(from.x, from.y, 'meteor');
                junk.r = junk.width * 0.5;
                this.junks.add(junk);
                junk.anchor.set(0, 0.5);
                junk.scale.set(0.3, 0.3);
            }
            // Astronaut
            else {
                junk = this.add.sprite(from.x, from.y, 'astronaut');
                junk.r = junk.width * 0.5;
                this.junks.add(junk);
                junk.anchor.set(0.5, 0.5);
                junk.scale.set(0.7, 0.7);
            }

            junk.outOfBoundsKill = true;
            this.game.physics.enable(junk, Phaser.Physics.ARCADE);
            var angle = this.game.physics.arcade.moveToXY(junk,to.x, to.y, 60);

            // Meteor
            if(prob < 7){
                var angle = this.game.physics.arcade.moveToXY(junk,to.x, to.y, 60);
                junk.rotation = angle+Math.PI-0.2;
                var tween = this.add.tween(junk).to({rotation: angle+Math.PI+0.2}, 300, Phaser.Easing.Sinusoidal.InOut, true, 0, -1, true  );
                tween.start();
            }
            // Astronaut
            else {
                this.game.physics.arcade.moveToXY(junk,to.x, to.y, 10);
                junk.body.angularVelocity = 50;
            }
        }
    },
    random: function(min, max) {
        this.randSeed = this.randSeed+1;
        var seed = this.randSeed;

        var random = function() {
            var x = Math.sin(seed++) * 10000;
            return x - Math.floor(x);
        };
        var rand = Math.floor(random() * (max - min + 1)) + min;
        return rand;
    },
    checkCoffeeCollision: function() {
      if (!this.coffee || !this.coffee.exists) {
        return;
      }

      if (this.junks) {
        this.junks.forEach(function(junk) {
          if (this.circlesOverlap(this.coffee, junk)) {
            this.coffee.kill();
            junk.kill();
            this.playFx(this.sounds.actions.hit);
          }

        }, this);
      }


      if (this.circlesOverlap(this.earth, this.coffee)) {
        // Already handled the hit, skip
        if(this.coffee.hit){ return; }

        // Get pin with minimum center distance to coffee
        var minDist = null;
        var minDistIndex = -1;
        this.pinpoints.forEach(function(pin) {
          if (this.circlesOverlap(this.coffee, pin)) {
            var i = this.pinpoints.getIndex(pin);
            var dist = this.centerDists(this.coffee, pin);
            if(!minDist || dist < minDist){
                minDist = dist;
                minDistIndex = i;
            }
          }
        }, this);

        // Earth hit
        if(minDistIndex === -1){
          this.playFx(this.sounds.actions.earth_hit);
        }
        // Pin hit
        else {
          this.pums.getChildAt(minDistIndex).visible = true;
          this.coffee.hit = true;
          this.playFx(this.sounds.actions.hit);
          this.score += 1;
          this.game.time.events.add(Phaser.Timer.SECOND,  function(){ this.renewPin(minDistIndex); }.bind(this), this);
        }

        this.coffee.kill();
        this.line.visible = true;
      }
    },
    newPin: function(){
        var pin   = this.pinpoints.create(0, 0, 'pinpoint');
        var pum        = this.pums.create(0, 0, 'pum');
        pin.angle = this.genPinPointAngle();
        pin.r          = 2;
        pum.angle      = pin.angle;
        pin.scale      = {x: 0.8, y: 0.8};
        pin.anchor     = {x: 0., y: 0.5};
        pum.scale      = {x:0.2, y:0.2};
        pum.anchor     = {x: 0., y: 0.5};
        pum.visible    = false;

        this.pinpoints.add(pin);
        this.pums.add(pum);

        pin.x = this.earth.width * 0.495 * Math.cos(pin.angle * Math.PI / 180);
        pin.y = this.earth.width * 0.495 * Math.sin(pin.angle * Math.PI / 180);

        pum.x = this.earth.width * 0.495 * Math.cos(pum.angle * Math.PI / 180);
        pum.y = this.earth.width * 0.495 * Math.sin(pum.angle * Math.PI / 180);

    },
    renewPin: function(index){
        var pinpoint = this.pinpoints.getChildAt(index);
        var pum      = this.pums.getChildAt(index);
        pinpoint.kill();
        pum.kill();
        this.game.time.events.add(Phaser.Timer.SECOND*2,  this.newPin, this);
    },

    circlesOverlap: function(circle1,circle2) {
      var distance = Math.sqrt(Math.pow(circle1.world.x - circle2.world.x, 2) + Math.pow(circle1.world.y - circle2.world.y, 2));
      return (distance < Math.max(circle1.r || circle1.width, circle2.r || circle2.width));
    },
    centerDists: function(circle1, circle2){
      return Math.sqrt(Math.pow(circle1.world.x - circle2.world.x, 2) + Math.pow(circle2.world.y - circle2.world.y, 2));
    }
  };

  window['chimera'] = window['chimera'] || {};
  window['chimera'].Game = Game;

}());
