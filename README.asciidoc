jsoSchema is a schema language and validation library for javascript
data, or you coudl call it json schema, that wouldn't be wrong.

= Installation =

We provide, in the built branch, minified version of jsoSchema for
jquery and requirejs (dojo/node).

= Introduction =

A jsoSchema schema is an object, in particular a function, which takes
as input a javascript object (usually the result of json parsing) and
tells you if the object meets certain conditions.

It's easiest if we start with an example. Let's say we have a bunch of
people objects, and they must all have a name, which itself has to be
a string:

  Record({ name: String() });

But that's probably wrong, they probably have an address field too,
but we don't know anything about it:

  Record({ name: String(),
           address: Object() });

actually, we do, we know that the address has to be a list of strings
(what each string means we don't know nor really care about):

  Record({ name: String(),
           address: Array(String()) });

oh, wait, they have to have an age too:

  Record({ name: String(),
           address: Array(String()),
           age: Number() });

but, now that I think about it, not just any number, an integer (we
don't allow kids who really want to specify that they're 3.5 years and
not 3 years old):

  Record({ name: String(),
           address: Array(String()),
           age: Integer() });

but, let's be pedantic. It's a positive number (actually it has to be
greater than 25, since our web site sells souls, and we all know the
devil doesn't want un-ripe souls):

  Record({ name: String(),
           address: Array(String()),
           age: And(Integer(), GreaterThanEquals(25)) });

thats our first example of combining schemas (we'd use && directly if
javascript would let us override operators, but it doesn't, so we
won't). jsoSchema defines a few schema which combine other schemas:
And, Or, Every and Any (and If, but we'll ignore that for now).

= API =

Read to code if you want all the details (the code, and not this
README, is what you're actually using, so you you should read that
anyway), but here's a, probably inaccurate, summary:

Number::
  A number (as per typeof)
String::
  A string (as per typeof)
Boolean::
  typeof(value) === "boolean"
Any::
  Any one, the first, of the passed in validators.
Or::
  two arguement form of Any
Every::
  All of the passed in validators.
And::
  two argument form of Every
OfType::
  a check on typeof
Enum::
  any one of the passed in values (as per ===);
Constant::
  === to the passed in value

= Defining new schemas =

If your schema can be expressed as a singe condition on a single
value, just use the Condition schema and be done with it. Otherwise,
read on, and may God have mercy on your soul (unless you eat
continuations for breakfast, than, gutten appetite).

A jso schema is just a 3 argument function: the value to validate,
what to do if the value is valid, and what to do if the value is
invalid. 

Let's pretend, as an example, that you wanted to write the And schema
combiner, but it didn't aplreay exsit (what we'll write in this
example is equivalent to the built in And combiner). You might be
tempted to wirte this:

  function (a, b) {
    return function (value, p, f) {
      if (a(value) && b(value)) {
        p();
      } else {
        f();
      }
    }
  }

i can see where you're coming from, and i understand what's going on
in your head, but your wrong; wrong with a capital W.

what you should have written was this:

  function (a, b) {
    return function (value, p, f) {
      return a(value, 
               function() { return b(value, p, f); },
               f);
      }
    }
  }

  
The latter function says, in more or less understandable english:

Test a, if it passes then test and if B passes do what we should have
done on success, otherwise do what we should have done on failure. If
A doesn't pass, than do what we were told to do on failure.

