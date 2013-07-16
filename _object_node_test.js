// Copyright (c) 2012 Titanium I.T. LLC. All rights reserved. See LICENSE.txt for details.

(function() {
	"use strict";
	mocha.setup({ignoreLeaks: true});

	describe("ObjectNode", function() {
		function newNode(name, object) {
			return new jdls.ObjectNode(name, object);
		}

		describe("id", function() {
			it("is unique for each node object regardless of contents", function() {
				var object = {};
				var node1 = newNode("name", object);
				var node2 = newNode("name", object);
				expect(node1.id()).to.not.equal(node2.id());
			});
		});

		describe("name", function() {
			it("is based on provided name for most objects", function() {
				var node = newNode("name", {});
				expect(node.name()).to.equal("name");
			});

			it("doesn't crash when object has no prototype", function() {
				var node = newNode("name", Object.create(null));
				expect(node.name()).to.equal("name");
			});

			it("uses function name for functions", function() {
				var node = newNode("name", function aFunction() {});
				expect(node.name()).to.equal("aFunction()");
			});

			it("is anonymous for unnamed functions", function() {
				var node = newNode("name", function() {});
				expect(node.name()).to.equal("<anon>()");
			});

			it("handles 'Function' special case", function() {
				var node = newNode("name", Function.prototype);
				expect(node.name()).to.equal("Function.prototype");
			});

			it("uses constructor name when present", function() {
				function TheConstructor() {}
				var node = newNode("name", TheConstructor.prototype);
				expect(node.name()).to.equal("TheConstructor.prototype");
			});

			it("does not use inherited constructor name", function() {
				var proto = {
					constructor: function TheConstructor() {}
				};
				var object = Object.create(proto);
				var node = newNode("name", object);
				expect(node.name()).to.equal("name");
			});

			it("does not use constructor name when constructor's prototype property points elsewhere", function() {
				var object = {
					constructor: function TheConstructor() {}
				};
				var node = newNode("name", object);
				expect(node.name()).to.equal("name");
			});
		});

		describe("type", function() {
			it("is based on prototype's constructor name", function() {
				var proto = {
					constructor: function TheConstructor() {}
				};

				var object = Object.create(proto);
				object.constructor = function NotThisOne() {};

				var node = newNode("name", object);
				expect(node.type()).to.equal("TheConstructor");
			});

			it("works even when prototype's constructor is inherited", function() {
				var grandfather = {
					constructor: function TheConstructor() {}
				};
				var proto = Object.create(grandfather);
				var node = newNode("name", Object.create(proto));
				expect(node.type()).to.equal("TheConstructor");
			});

			it("is null when object has no prototype", function() {
				var node = newNode("name", Object.create(null));
				expect(node.type()).to.equal("<null>");
			});

			it("is anonymous when constructor has no name", function() {
				var proto = {
					constructor: function() {}
				};
				var node = newNode("name", Object.create(proto));
				expect(node.type()).to.equal("<anon>");
			});

			it("is anonymous when prototype has no constructor", function() {
				var proto = Object.create(null);
				var node = newNode("name", Object.create(proto));
				expect(node.type()).to.equal("<anon>");
			});

			it("is anonymous when prototype constructor is not a function", function() {
				var proto = {
					constructor: "malformed constructor"
				};
				var node = newNode("name", Object.create(proto));
				expect(node.type()).to.equal("<anon>");
			});

			it("is anonymous when prototype constructor is null", function() {
				var proto = {
					constructor: null
				};
				var node = newNode("name", Object.create(proto));
				expect(node.type()).to.equal("<anon>");
			});
		});

		describe("equals", function() {
			it("is equal when objects have same identity, regardless of name", function() {
				var object = {};
				var node1 = newNode("name", object);
				var node2 = newNode("different name", object);
				expect(node1.equals(node2)).to.be(true);
			});

			it("is not equal when objects have different identify, even if they have same contents", function() {
				var node1 = newNode("name", {});
				var node2 = newNode("name", {});
				expect(node1.equals(node2)).to.be(false);
			});
		});

		describe("properties", function() {
			function properties(object) {
				var node = newNode("name", object);
				return node.properties();
			}

			function conversionOf(variable) {
				var object = { name: variable };
				return properties(object)[0].value;
			}

			it("provides each property", function() {
				var object = {
					a: 1,
					b: 2,
					c: 3
				};
				expect(properties(object)).to.eql([
					{ name: "a", value: "1", id: "f0" },
					{ name: "b", value: "2", id: "f1" },
					{ name: "c", value: "3", id: "f2" }
				]);
			});

			it("converts primitives", function() {
				expect(conversionOf(undefined)).to.equal("undefined");
				expect(conversionOf(null)).to.equal("null");

				expect(conversionOf(true)).to.equal("true");
				expect(conversionOf(false)).to.equal("false");

				expect(conversionOf(0)).to.equal("0");
				expect(conversionOf(1)).to.equal("1");

				expect(conversionOf("string")).to.equal('"string"');
			});

			it("converts functions", function() {
				expect(conversionOf(function aFunction() {})).to.equal("aFunction()");
				expect(conversionOf(function () {})).to.equal("<anon>()");
			});

			it("converts objects to their names when they have one", function() {
				function MyClass() {}
				expect(conversionOf(MyClass.prototype)).to.equal("MyClass.prototype");
			});

			it("converts objects to their types when they don't have a name", function() {
				expect(conversionOf({})).to.equal("{Object}");
			});

			it("handles 'Function' special case", function() {
				expect(conversionOf(Function.prototype)).to.equal("Function.prototype");
			});
		});

		describe("prototype", function() {
			function prototype(object) {
				var node = newNode("name", object);
				return node.prototype();
			}

			it("converts the same way as fields", function() {
				function MyClass() {}
				expect(prototype(new MyClass())).to.eql({ name: "<prototype>", value: "MyClass.prototype", id: "proto" });
			});
		});

		describe("sub-nodes", function() {
			function subNodes(object) {
				var result = [];
				var node = newNode("name", object);
				node.forEachSubNode(function(subnode) {
					result.push(subnode.name());
				});
				return result;
			}

			it("provides each function and object, and the prototype", function() {
				function MyClass() {}
				var object = new MyClass();
				object.a = function aFunction() {};
				object.b = Array.prototype;

				expect(subNodes(object)).to.eql([
					"aFunction()",
					"Array.prototype",
					"MyClass.prototype"
				]);
			});

			it("skips null, undefined, and primitives", function() {
				var object = {
					a: true,
					b: "string",
					c: 10,
					d: undefined,
					e: null
				};
				expect(subNodes(object)).to.eql([
					"Object.prototype"
				]);
			});

			it("skips prototype if it's null", function() {
				expect(subNodes(Object.create(null))).to.eql([]);
			});

			it("provides fallback name based on property name", function() {
				var proto = Object.create(null);
				var object = Object.create(proto);
				object.a = {
					b: {}
				};
				expect(subNodes(object)).to.eql([
					"name.a",
					"name.<prototype>"
				]);
			});

			it("provides id and name that matches field id and name", function() {
				var object = {
					a: 1,
					b: {}
				};
				var indexes = [];
				newNode("name", object).forEachSubNode(function(subnode, index, name) {
					indexes.push({ index: index, name: name });
				});
				expect(indexes).to.eql([
					{ index: "f1", name: "b" },
					{ index: "proto", name: "<prototype>" }
				]);
			});

		});

	});
}());